"use client"
import Navbar from './components/Navbar';

import './globals.css';
import Home from "./components/Home"
// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';

function App() {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.


  return (
    <>
   
           <Navbar/>
           <Home/>
  
    </>
  );
}

export default App;