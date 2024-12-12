import { IdlAccounts, Program } from "@coral-xyz/anchor";
import { IDL, Dex } from "./idl";
import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";

export const programId = new PublicKey("F1r79aupgZuTSQ8WNqyJA2LrLhqgF9FNUEgZLcXyP9NE"); 

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// Initialize the program interface with the IDL, program ID, and connection.
// This setup allows us to interact with the on-chain program using the defined interface.
export const program = new Program<Dex>(IDL, {
  connection,
});
// Derive a PDA for the counter account, using "counter" as the seed.
// We'll use this to update the counter on-chain.
export const [makeOfferPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("offer")],
  program.programId
);

// Define a TypeScript type for the Counter data structure based on the IDL.
export type DexData = IdlAccounts<Dex>[];