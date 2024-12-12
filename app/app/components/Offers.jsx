'use client'

import React, { useState, useEffect } from 'react'
import { Card } from "./ui/card"
import { Button } from "./ui/button"
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { program, programId } from "../../anchor/setup";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import { 
  getAssociatedTokenAddress, 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount
} from "@solana/spl-token";

function truncateAddress(address, chars = 6){
  return `${address?.slice(0, chars)}...${address?.slice(-chars)}`
}

export default function AvailableOffers() {
  const { publicKey, sendTransaction, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [hoveredItem, setHoveredItem] = useState(null)
  const [offers, setOffers] = useState(null)
  
 useEffect(() => {
    
    const fetchOffers = async () => {
      if (!connection) {
        console.log("Connection not ready");
        return;
      }
  
      try {
        // Fetch all accounts owned by the program
        const accounts = await connection.getProgramAccounts(programId);
         
  
        const fetchedOffers = accounts.map((account) => {
          try {            
            // Detailed byte-by-byte logging
            const data = account.account.data;
            
            return {
              pubkey: account.pubkey.toString(),
              rawData: Array.from(data), // Log raw byte values
              id: new BN(data.slice(8, 16), 'le').toString(),
              maker: new PublicKey(data.slice(16, 48)).toString(),
              tokenMintA: new PublicKey(data.slice(48, 80)).toString(),
              tokenMintB: new PublicKey(data.slice(80, 112)).toString(),
              tokenAOffered: new BN(data.slice(112, 120), 'le').toString(),
              tokenBWanted: new BN(data.slice(120, 128), 'le').toString(),
              bump: data[128]
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



  const HandleAcceptOffer = async (offer) => {
    try {
      // Wallet and Connection Validation
      if (!publicKey) {
        console.error("Wallet not connected");
        alert("Please connect your wallet first");
        return;
      }
  
      if (!sendTransaction) {
        console.error("Wallet adapter not initialized");
        alert("Wallet adapter is not ready");
        return;
      }
  
      // Detailed Logging of Offer Object
      console.log("Full Offer Object:", JSON.stringify(offer, null, 2));
  
      // Derive maker and mint PublicKeys
      const maker = new PublicKey(offer.maker);
      const tokenMintA = new PublicKey(offer.tokenMintA);
      const tokenMintB = new PublicKey(offer.tokenMintB);
  
      // Validate Critical Addresses
      if (!maker || !tokenMintA || !tokenMintB) {
        throw new Error("Invalid token or maker addresses");
      }
  
      // Derive PDA for the offer with explicit logging
      const [offerPDA, offerBump] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("offer"), 
          maker.toBuffer(), 
          new BN(offer.id).toArrayLike(Buffer, "le", 8)
        ],
        program.programId
      );
  
      // Comprehensive Address Logging
      console.log("Derivation Details:", {
        maker: maker.toString(),
        tokenMintA: tokenMintA.toString(),
        tokenMintB: tokenMintB.toString(),
        offerPDA: offerPDA.toString(),
        offerBump: offerBump
      });
  
      // Derive and Validate Token Accounts
      const takerTokenAccountA = await getOrCreateAssociatedTokenAccount(
        connection,
        publicKey,
        tokenMintA,
        publicKey
      );
  
      const takerTokenAccountB = await getOrCreateAssociatedTokenAccount(
        connection,
        publicKey,
        tokenMintB,
        publicKey
      );
  
      // Derive Maker's Token Account for Token B
      const makerTokenAccountB = await getAssociatedTokenAddress(tokenMintB, maker);
  
      // Derive Vault Address
      const vault = await anchor.utils.token.associatedAddress({
        mint: tokenMintA,
        owner: offerPDA,
      });
  
      // Detailed Account Logging
      console.log("Account Addresses:", {
        takerTokenAccountA: takerTokenAccountA.address.toString(),
        takerTokenAccountB: takerTokenAccountB.address.toString(),
        makerTokenAccountB: makerTokenAccountB.toString(),
        vault: vault.toString()
      });
  
      // Prepare Transaction with Enhanced Error Handling
      const transaction = await program.methods
        .takeOffer()
        .accounts({
          taker: publicKey,
          maker,
          tokenMintA,
          tokenMintB,
          takerTokenAccountA: takerTokenAccountA.address,
          takerTokenAccountB: takerTokenAccountB.address,
          makerTokenAccountB,
          offer: offerPDA,
          vault,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .transaction();
  
      // Transaction Debugging
      console.log("Transaction Preparation Details:", {
        instructions: transaction.instructions.length,
        instructionDetails: transaction.instructions.map(instr => ({
          programId: instr.programId.toString(),
          keys: instr.keys.map(key => key.pubkey.toString())
        }))
      });
  
      // Set Transaction Parameters
      transaction.feePayer = publicKey;
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
  
      // Enhanced Transaction Sending
      try {
        const signature = await sendTransaction(transaction, connection);
        console.log("Transaction Signature:", signature);
  
        // Confirm Transaction
        const confirmation = await connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight
        });
  
        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }
  
        alert("Swap successful!");
  
      } catch (sendError) {
        // Fallback Manual Transaction Signing
        console.error("Standard Send Failed. Attempting manual signing:", sendError);
        
        try {
          const signedTransaction = await signTransaction(transaction);
          const signature = await connection.sendRawTransaction(signedTransaction.serialize());
          
          const confirmation = await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight
          });
  
          if (confirmation.value.err) {
            throw new Error(`Manual transaction failed: ${JSON.stringify(confirmation.value.err)}`);
          }
  
          alert("Swap successful with manual signing!");
        } catch (manualSignError) {
          console.error("Manual Transaction Signing Failed:", manualSignError);
          alert(`Swap failed: ${manualSignError.message}`);
        }
      }
  
    } catch (error) {
      // Comprehensive Error Logging
      console.error("Swap Error Details:", {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        errorCode: error.code
      });
  
      let errorMessage = "An unexpected error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      alert(`Error: ${errorMessage}`);
    }
  };
  

  return (
    <div className="w-full max-w-4xl mx-auto mt-16">
      <h2 className="text-4xl md:text-4xl font-bold text-center mb-12 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
            Available Offers    
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {offers && offers.map((offer, index) => (
          <Card key={index} className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50 shadow-lg shadow-purple-500/10 p-6 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20">
            <div className="space-y-5">
              <div className="relative">
                <p className="text-sm font-medium text-gray-300 mb-1">Offer Created Address:</p>
                <p 
                  className="text-white text-lg font-medium cursor-pointer"
                  onMouseEnter={() => setHoveredItem({ index, field: 'offerCreatedAddress' })}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  {truncateAddress(offer.maker)}
                </p>
                {hoveredItem?.index === index && hoveredItem?.field === 'offerCreatedAddress' && (
                  <div className="absolute -top-2 left-0 transform -translate-y-full bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-lg z-10 w-full">
                    <p className="text-sm text-white break-all">{offer.maker}</p>
                  </div>
                )}
              </div>

              <div className="relative">
                <p className="text-sm font-medium text-gray-300 mb-1">Token Offered Address:</p>
                <p 
                  className="text-white text-lg font-medium cursor-pointer"
                  onMouseEnter={() => setHoveredItem({ index, field: 'tokenOfferedAddress' })}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  {truncateAddress(offer.tokenMintA)}
                </p>
                {hoveredItem?.index === index && hoveredItem?.field === 'tokenOfferedAddress' && (
                  <div className="absolute -top-2 left-0 transform -translate-y-full bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-lg z-10 w-full">
                    <p className="text-sm text-white break-all">{offer.tokenMintA}</p>
                  </div>
                )}
              </div>

              <div className="relative">
                <p className="text-sm font-medium text-gray-300 mb-1">Amount of Token Offered:</p>
                <p 
                  className="text-white text-lg font-medium cursor-pointer"
                  onMouseEnter={() => setHoveredItem({ index, field: 'amountOfTokenOffered' })}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  {offer.tokenAOffered}
                </p>
                {hoveredItem?.index === index && hoveredItem?.field === 'amountOfTokenOffered' && (
                  <div className="absolute -top-2 left-0 transform -translate-y-full bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-lg z-10 w-full">
                    <p className="text-sm text-white break-all">{offer.tokenAOffered}</p>
                  </div>
                )}
              </div>

              <div className="relative">
                <p className="text-sm font-medium text-gray-300 mb-1">Token Wanted Address:</p>
                <p 
                  className="text-white text-lg font-medium cursor-pointer"
                  onMouseEnter={() => setHoveredItem({ index, field: 'tokenWantedAddress' })}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  {truncateAddress(offer.tokenMintB)}
                </p>
                {hoveredItem?.index === index && hoveredItem?.field === 'tokenWantedAddress' && (
                  <div className="absolute -top-2 left-0 transform -translate-y-full bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-lg z-10 w-full">
                    <p className="text-sm text-white break-all">{offer.tokenMintB}</p>
                  </div>
                )}
              </div>

              <div className="relative">
                <p className="text-sm font-medium text-gray-300 mb-1">Amount of Token Wanted:</p>
                <p 
                  className="text-white text-lg font-medium cursor-pointer"
                  onMouseEnter={() => setHoveredItem({ index, field: 'amountOfTokenWanted' })}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  {offer.tokenBWanted}
                </p>
                {hoveredItem?.index === index && hoveredItem?.field === 'amountOfTokenWanted' && (
                  <div className="absolute -top-2 left-0 transform -translate-y-full bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-lg z-10 w-full">
                    <p className="text-sm text-white break-all">{offer.tokenBWanted}</p>
                  </div>
                )}
              </div>
              
              <Button onClick={() => {
                console.log("button clicked")
                HandleAcceptOffer(offer);
              }} className="w-full mt-6 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white py-3 text-base font-semibold transition-all duration-300 ease-in-out transform hover:scale-105">
                Accept Offer
              </Button>
            
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

