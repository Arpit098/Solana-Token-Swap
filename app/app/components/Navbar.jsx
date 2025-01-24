"use client"
import React from 'react'
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
    WalletModalProvider,
    WalletMultiButton,
} from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';

const Navbar = () => {
    const { connection } = useConnection();
    const { publicKey } = useWallet();

    return (
        <nav className="fixed top-0 w-full bg-gradient-to-r from-gray-900 via-black to-gray-800 text-white p-4 shadow-lg z-50">
            <div className="container mx-auto flex justify-between items-center">
                <Link href="/" className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
                    SwapOnSolana
                </Link>
                <WalletMultiButton className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 text-white py-2 px-4 rounded-md transition-all duration-300 ease-in-out transform hover:scale-105" />
            </div>
        </nav>
    )
}

export default Navbar;
