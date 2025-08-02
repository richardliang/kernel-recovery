import "dotenv/config"
import {
  createKernelAccount,
  createZeroDevPaymasterClient,
  createKernelAccountClient,
} from "@zerodev/sdk"
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import { 
  http, 
  Hex, 
  createPublicClient, 
  formatUnits,
  Address,
  encodeAbiParameters
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { mainnet } from "viem/chains"
import { getEntryPoint, KERNEL_V2_4 } from "@zerodev/sdk/constants"

// Mainnet USDC Contract
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as const
const USDC_DECIMALS = 6

// Minimal ERC20 ABI for balance and transfer
const ERC20_ABI = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const

if (!process.env.ZERODEV_RPC) {
  throw new Error("ZERODEV_RPC must be set")
}

if (!process.env.PRIVATE_KEY) {
  throw new Error("PRIVATE_KEY must be set")
}

const signer = privateKeyToAccount(process.env.PRIVATE_KEY as Hex)
const entryPoint = getEntryPoint("0.6")
const kernelVersion = KERNEL_V2_4

const main = async () => {
  console.log("🔄 Starting USDC Transfer on Mainnet")
  console.log(`🔑 Signer: ${signer.address}`)
  console.log(`📤 Recipient: ${signer.address}`)

  // Create public client
  const publicClient = createPublicClient({
    transport: http(process.env.ZERODEV_RPC),
    chain: mainnet,
  })

  // Create validator
  const validator = await signerToEcdsaValidator(publicClient, {
    signer,
    entryPoint,
    kernelVersion,
  })

  // Create account
  const account = await createKernelAccount(publicClient, {
    plugins: {
      sudo: validator,
    },
    entryPoint,
    kernelVersion,
  })

  console.log(`\n💼 Smart Account: ${account.address}`)

  // Check USDC balance
  const balance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [account.address],
  })

  const formattedBalance = formatUnits(balance, USDC_DECIMALS)
  console.log(`💰 USDC Balance: ${formattedBalance} USDC`)

  if (balance === 0n) {
    console.log("❌ No USDC found")
    process.exit(0)
  }

  // Transfer full balance
  const amountToTransfer = balance
  const formattedTransferAmount = formatUnits(amountToTransfer, USDC_DECIMALS)

  console.log(`\n📤 Transferring: ${formattedTransferAmount} USDC (full balance)`)

  // Create kernel client
  const kernelClient = createKernelAccountClient({
    account,
    chain: mainnet,
    bundlerTransport: http(process.env.ZERODEV_RPC),
    client: publicClient
  })

  console.log("\n💸 Sending transaction...")

  try {
    // Encode transfer function selector and parameters
    const functionSelector = "0xa9059cbb" // transfer(address,uint256)
    const encodedParams = encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }],
      [signer.address, amountToTransfer]
    )
    const transferData = (functionSelector + encodedParams.slice(2)) as Hex

    const userOpHash = await kernelClient.sendUserOperation({
      callData: await account.encodeCalls([
        {
          to: USDC_ADDRESS,
          value: 0n,
          data: transferData,
        },
      ]),
    })

    console.log("📝 UserOp Hash:", userOpHash)

    const receipt = await kernelClient.waitForUserOperationReceipt({
      hash: userOpHash,
    })

    console.log("✅ Transaction Hash:", receipt.receipt.transactionHash)
    console.log("\n🎉 Transfer complete!")
    
  } catch (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  }

  process.exit(0)
}

main().catch((error) => {
  console.error("❌ Fatal error:", error)
  process.exit(1)
})