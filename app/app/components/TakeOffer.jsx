import React,{ useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { program, offerPDA, offerData } from "../anchor/setup";


function TakeOffer() {
    const { connection } = useConnection();
    const [offerData, setofferData] = useState<offerData | null>(null);
    
    useEffect(() => {
        // Fetch initial account data
        program.account.offer.fetch(offerPDA).then((data) => {
          setofferData(data);
        });
    
        // Subscribe to account change
        const subscriptionId = connection.onAccountChange(
          offerPDA,
          (accountInfo) => {
            setofferData(
              program.coder.accounts.decode("offer", accountInfo.data)
            );
          }
        );
    
        return () => {
          // Unsubscribe from account change
          connection.removeAccountChangeListener(subscriptionId);
        };
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [program]);
  return (
    <div>TakeOffer</div>
  )
}

export default TakeOffer