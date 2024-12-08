'use client'
import { useState } from "react"
import { Button } from "./ui/button"
import { Card } from "./ui/card"
import { Input } from "./Input"
import { ChevronsUpDownIcon } from "./ui/icons"
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { program } from "../../anchor/setup";
import anchor from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

export default function SwapInterface() {
    const { publicKey, sendTransaction } = useWallet();
    const { connection } = useConnection();
    const [isLoading, setIsLoading] = useState(false);

    const [tokenAddress1, setTokenAddress1] = useState("")
    const [amount1, setAmount1] = useState("")
    const [tokenAddress2, setTokenAddress2] = useState("")
    const [amount2, setAmount2] = useState("")

   
    const handleSwap = async () => {
        if (!publicKey) return;
      console.log("started")
        setIsLoading(true);
      
        const tokenMintA = new anchor.web3.PublicKey(tokenAddress1);
        const tokenMintB = new anchor.web3.PublicKey(tokenAddress2);
        const id = Math.floor(Math.random() * 1000000); // Random ID for the offer
      
        try {
          // Derive the PDA for the offer account
          const [offerPDA, offerBump] = PublicKey.createProgramAddressSync(
            [Buffer.from("offer"), publicKey.toBuffer(), new BN(id).toArrayLike(Buffer, "le", 8)],
            program.programId
          );
      
          // Get the associated token account for the maker (token_mint_a)
          const makerTokenAccountA = await anchor.utils.token.associatedAddress({
            mint: tokenMintA,
            owner: publicKey,
          });
      
          // Derive the vault account for the offer
          const vault = await anchor.utils.token.associatedAddress({
            mint: tokenMintA,
            owner: offerPDA,
          });
      
          // Build the transaction
          const transaction = await program.methods
            .makeOffer(id, amount1, amount2) // Pass the random ID and amounts
            .accounts({
              maker: publicKey,
              tokenMintA,
              tokenMintB,
              makerTokenAccountA,
              offer: offerPDA,
              vault,
              systemProgram: anchor.web3.SystemProgram.programId,
              tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
              associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            })
            .transaction();
      
          // Send the transaction
          const transactionSignature = await sendTransaction(transaction, connection);
      
          console.log(
            `View on explorer: https://solana.fm/tx/${transactionSignature}?cluster=devnet-alpha`
          );
        } catch (error) {
          console.error("Error during transaction:", error);
        } finally {
          setIsLoading(false);
        }
      };
      
 
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white relative overflow-hidden">
        {/* Floating background icons */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-12 h-12 rounded-full bg-pink-500/10 blur-xl animate-pulse" />
          <div className="absolute top-40 right-40 w-16 h-16 rounded-full bg-yellow-500/10 blur-xl animate-pulse" />
          <div className="absolute bottom-40 left-1/4 w-20 h-20 rounded-full bg-green-500/10 blur-xl animate-pulse" />
          <div className="absolute top-1/3 right-1/4 w-24 h-24 rounded-full bg-blue-500/10 blur-xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-16 h-16 rounded-full bg-purple-500/10 blur-xl animate-pulse" />
        </div>
  
        {/* Main content */}
        <div className="relative z-10 container mx-auto px-4 pt-20 pb-12 flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-4xl md:text-6xl font-bold text-center mb-12 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
            Swap anytime,
            <br />
            anywhere.
          </h1>
  
          <Card className="w-full max-w-md bg-gray-800/50 backdrop-blur-xl border-gray-700/50 shadow-lg shadow-purple-500/10 p-6 space-y-6">
            {/* First token input */}
            <div className="space-y-2">
              <label htmlFor="token-address-1" className="text-sm text-gray-300">Token Address 1</label>
              <Input
                id="token-address-1"
                type="text"
                placeholder="Enter token address"
                value={tokenAddress1}
                onChange={(e) => setTokenAddress1(e.target.value)}
                className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="amount-1" className="text-sm text-gray-300">Amount 1</label>
              <Input
                id="amount-1"
                type="number"
                placeholder="0"
                value={amount1}
                onChange={(e) => setAmount1(e.target.value)}
                className="bg-gray-700/50 border-gray-600 text-2xl text-white placeholder-gray-400"
              />
            </div>
  
            {/* Swap icon */}
            <div className="flex justify-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center p-1">
                <div className="bg-gray-800 w-full h-full rounded-full flex items-center justify-center">
                  <ChevronsUpDownIcon className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
  
            {/* Second token input */}
            <div className="space-y-2">
              <label htmlFor="token-address-2" className="text-sm text-gray-300">Token Address 2</label>
              <Input
                id="token-address-2"
                type="text"
                placeholder="Enter token address"
                value={tokenAddress2}
                onChange={(e) => setTokenAddress2(e.target.value)}
                className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="amount-2" className="text-sm text-gray-300">Amount 2</label>
              <Input
                id="amount-2"
                type="number"
                placeholder="0"
                value={amount2}
                onChange={(e) => setAmount2(e.target.value)}
                className="bg-gray-700/50 border-gray-600 text-2xl text-white placeholder-gray-400"
              />
            </div>
  
            {/* Action button */}
            <Button onClick={handleSwap} className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 text-white py-6 text-lg font-semibold transition-all duration-300 ease-in-out transform hover:scale-105">
              Swap Tokens
            </Button>
          </Card>
  
          <p className="text-gray-400 text-center mt-8 max-w-md">
            The largest onchain marketplace. Buy and sell crypto on Ethereum and 11+ other chains.
          </p>
        </div>
      </div>
    )
  }
  
  