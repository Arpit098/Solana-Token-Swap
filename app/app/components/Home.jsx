'use client'
import { useEffect, useState } from "react"
import { Button } from "./ui/button"
import { Card } from "./ui/card"
import { Input } from "./Input"
import { ChevronsUpDownIcon } from "./ui/icons"
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { program, programId } from "../../anchor/setup";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
export default function SwapInterface() {
    const { publicKey, sendTransaction } = useWallet();
    const { connection } = useConnection();
    const [isLoading, setIsLoading] = useState(false);

    const [tokenAddress1, setTokenAddress1] = useState("")
    const [amount1, setAmount1] = useState("")
    const [tokenAddress2, setTokenAddress2] = useState("")
    const [amount2, setAmount2] = useState("")
    
    useEffect(() => {
      const fetchOffers = async () => {
        if (!connection) {
          console.log("Connection not ready");
          return;
        }
    
        try {
          // Fetch all accounts owned by the program
          const accounts = await connection.getProgramAccounts(programId);
           
          console.log("Raw Accounts Found:", accounts);
    
          // If you have the IDL, use this method
          const fetchedOffers = accounts.map((account) => {
            try {
              // Basic manual parsing based on your Rust struct
              // Adjust the byte offsets and parsing logic based on your exact Offer struct
              const data = account.account.data;
              
              return {
                pubkey: account.pubkey.toString(),
                id: new BN(data.slice(8, 16), 'le'), // Assuming first 8 bytes are discriminator
                maker: new PublicKey(data.slice(16, 48)),
                tokenMintA: new PublicKey(data.slice(48, 80)),
                tokenMintB: new PublicKey(data.slice(80, 112)),
                tokenBWanted: new BN(data.slice(112, 120), 'le'),
                bump: data[120]
              };
            } catch (decodeError) {
              console.error("Decoding error for account:", account.pubkey.toString(), decodeError);
              return null;
            }
          }).filter(offer => offer !== null);
    
          console.log("Fetched Offers:", fetchedOffers);
          setOffers(fetchedOffers);
        } catch (err) {
          console.error("Error fetching offers:", err);
        }
      };
    
      fetchOffers();
    }, [connection, programId]);
   
    const handleSwap = async () => {
      if (!publicKey) {
        console.error("Wallet not connected");
        return;
      }
    
      setIsLoading(true);
    
      try {
        // Validate input fields
        if (!tokenAddress1 || !tokenAddress2) {
          throw new Error("Please enter token addresses for both tokens");
        }
    
        // Validate token addresses
        let tokenMintA, tokenMintB;
        try {
          tokenMintA = new PublicKey(tokenAddress1);
          tokenMintB = new PublicKey(tokenAddress2);
        } catch (addressError) {
          throw new Error(`Invalid token address: ${addressError.message}`);
        }
    
        // Generate a random ID
        const id = new BN(Math.floor(Math.random() * 1000000));
    
        // Convert the id to little-endian bytes
        const idBytes = id.toArrayLike(Buffer, "le", 8);
    
        // Validate amounts
        if (!amount1 || !amount2) {
          throw new Error("Please enter amounts for both tokens");
        }
    
        if (isNaN(Number(amount1)) || isNaN(Number(amount2))) {
          throw new Error("Invalid input: amount1 or amount2 is not a number.");
        }
    
        const scaledAmount1 = new BN(Number(amount1) * (10 ** 9));
        const scaledAmount2 = new BN(Number(amount2) * (10 ** 9));
    
        // Derive the PDA for the offer account
        const [offerPDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("offer"), 
            publicKey.toBuffer(), 
            idBytes
          ],
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
    
        console.log("Transaction Preparation Details:", {
          maker: publicKey.toBase58(),
          tokenMintA: tokenMintA.toBase58(),
          tokenMintB: tokenMintB.toBase58(),
          makerTokenAccountA: makerTokenAccountA.toBase58(),
          offerPDA: offerPDA.toBase58(),
          vault: vault.toBase58(),
          id: id.toString(),
          scaledAmount1: scaledAmount1.toString(),
          scaledAmount2: scaledAmount2.toString()
        });
    
        // Prepare transaction
        const transaction = await program.methods
          .makeOffer(id, scaledAmount1, scaledAmount2)
          .accounts({
            maker: publicKey,
            tokenMintA,
            tokenMintB,
            makerTokenAccountA,
            offer: offerPDA,
            vault,
            systemProgram: SystemProgram.programId,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          })
          .transaction();
    
        // Additional transaction preparation
        transaction.feePayer = publicKey;
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    
        console.log("Transaction prepared:", transaction);
    
        // Send the transaction
        const signature = await sendTransaction(transaction, connection);
    
        console.log("Transaction sent. Signature:", signature);
    
        const confirmation = await connection.confirmTransaction({
          signature, 
          ...(await connection.getLatestBlockhash())
        });
    
        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }
    
        alert("Swap successful!");
      } catch (error) {
        console.error("Swap Error Details:", error);
        
        let errorMessage = "An unexpected error occurred";
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        
        alert(`Transaction failed: ${errorMessage}`);
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
  
  