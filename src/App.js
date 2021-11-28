import './App.css';
import {useState, useEffect} from 'react'
import {ADDRESS, ABI, NETWORK_ID, TOKEN_ABI, TOKEN_ADDRESS, VAULT_ABI} from './constants';
import WalletConnect from "walletconnect";

function App() {
  
  const $ = window.jQuery;

  const [error, setError] = useState("");
  const [softcap, setSoftcap] = useState(0);
  const [hardcap, setHardcap] = useState(0);
  const [raised, setRaised] = useState(0);
  const [mine, setMine] = useState(0);
  const [account, setAccount] = useState("");
  const [approved, setApproved] = useState("");
  const [contract, setContract] = useState("");
  const [token, setToken] = useState("");
  const [web3, setWeb3] = useState("");
  const [connected, setConnected] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [id, setId] = useState('');
  const [block, setBlock] = useState('');

  const wc = new WalletConnect({
    clientMeta: {description: 'My dApp'},
  });


  useEffect(() => {
    if(localStorage.getItem('wc') === "true"){
      setupWC();
    }
  } , [])

  useEffect(() => {
    const i = setInterval(() => {
      setBlock(b=>!b);
    }, 3000);
    return () => {clearInterval(i)};
  },[]);

  useEffect(() => {
   
    if(web3!==""){
      const _token = new web3.eth.Contract(TOKEN_ABI, TOKEN_ADDRESS);      
      const presale = new web3.eth.Contract(ABI, ADDRESS);
      presale.methods.goal().call().then(setSoftcap);
      presale.methods.cap().call().then(setHardcap);
      presale.methods.weiRaised().call().then(setRaised);

      setContract(presale);
      setToken(_token);

      if(id === ''){
        web3.eth.net.getId().then(_id => setId(_id));
      }
      web3.currentProvider.on("accountsChanged", function (accounts) {
        setAccount(accounts[0]);
      });

      web3.currentProvider.on("networkChanged", function (networkId) {
        web3.eth.net.getId().then((id) => setId(id));
      });

      web3.currentProvider.on("disconnect", function (error) {
        localStorage.setItem("wc", false);
        setConnected(false);
        setWeb3("");
      })
    }
  },[web3])

  useEffect(() => {
    const fetch = async () => {
      if(!web3){
        if (window.ethereum || window.web3) {
          const web3 = new window.Web3(window.web3.currentProvider); 
          setWeb3(web3);
        }else{
          setError("Please install MetaMask or TrustWallet");
        }
      }else{
        let accounts = [];
        try {
          accounts = await web3.currentProvider.enable();
          const _account = web3.utils.toChecksumAddress(accounts[0]);
          if(_account !== account){
            setAccount(_account);
            setConnected(true);
          }
        } catch (e) {
          setConnected(false);
        }
        if (id !== NETWORK_ID && id !== '') {
          setLoading(false);
          setError(
            `Wrong network, Switch to Smart Chain ${NETWORK_ID === 97 ? "Testnet" : ""}`
          );
          return;
        }
        if (connected) {
          token.methods
            .allowance(account, ADDRESS)
            .call()
            .then((al) => {
              setApproved(al > 0);
            });
      
          const _mine = await contract.methods.getUserContribution(account).call(); 
          const vault = await contract.methods.vault().call();
          const VAULT = new web3.eth.Contract(VAULT_ABI, vault);
          const claimed = (await VAULT.methods.deposited(account).call()).toString() <= 0;
          setMine(_mine);
          setClaimed(claimed);
        }

        if(loading){
          setLoading(false);
        }
      }
    }
    fetch();
  }, [account, $, web3, id, block]);

  const connect = async (e) => {
    try {
      const accounts = await web3.currentProvider.enable();
      setAccount(accounts[0]);
      setConnected(true);
    } catch (e) {
      setConnected(false);
    }
  }

  const setupWC = async () =>{
    try{
      await wc.connect({
        chainId: NETWORK_ID,
        rpcUrl: "https://bsc-dataseed.binance.org",
      });
      const provider = wc.getWeb3Provider({
        rpc: {56:"https://bsc-dataseed.binance.org"},
        rpcUrl: "https://bsc-dataseed.binance.org",
      });
      localStorage.setItem("wc", true);
      setWeb3(new window.Web3(provider));
      setConnected(true);
    }
    catch(e){}
  }

  const takeBack = async (e) => {
    e.preventDefault();
    $(e.target).attr("disabled", true);
    if(!approved){
      $(e.target).text("Approving...");
      try{
        await token.methods
          .approve(
            ADDRESS,
              "115792089237316195423570985008687907853269984665640564039457584007913129639935"
          )
          .send({ from: account }).then(() => {
            $(e.target).text("Claiming...");
            setApproved(true);
          }) 
      }
      catch(err){
        $(e.target).text("Approve & Claim");
        $(e.target).removeAttr("disabled");
        alert("Failed to Approve")
        return;
      }
    }
    if(approved){
      $(e.target).text("Claiming...");
      try {
        await contract.methods.claimRefund().send({from: account});    
        $(e.target).text("Claimed");
      } catch (err) {
        alert("Failed to Claim");
        $(e.target).text("Claim");
        $(e.target).removeAttr("disabled");
      }
    };
  }
  return (
    <div className="App">
      <header
        className="App-header"
        style={{ backgroundImage: "url(/bg-min.jpeg)" }}
      >
        {web3 ? (
          loading ? (
            <p>Loading...</p>
          ) : connected ? (
            error.startsWith("Wrong network") ? (
              <p>{error}</p>
            ) : (
              <div className="rounded bg-dark p-5 opacity">
                <p>Public sale has ended</p>
                <div>
                  Raised:{" "}
                  <span className="pink-text">
                    {web3.utils.fromWei(raised.toString(), "ether")}
                  </span>{" "}
                  BNB
                  <br />
                  Soft Cap:{" "}
                  <span className="pink-text">
                    {web3.utils.fromWei(softcap.toString(), "ether")}
                  </span>{" "}
                  BNB
                  <br />
                  Hard Cap:{" "}
                  <span className="pink-text">
                    {web3.utils.fromWei(hardcap.toString(), "ether")}
                  </span>{" "}
                  BNB
                  <br />
                  Your Contribution:{" "}
                  <span className="pink-text">
                    {web3.utils.fromWei(mine.toString(), "ether")}
                  </span>{" "}
                  BNB
                </div>
                <p className="my-3 text-center">1 BNB = 666666666.67 tokens</p>
                {claimed ?
                  <div className="text-center my-2">
                    <button
                      disabled
                      className="btn btn-main"
                      style={{
                        display: "block"
                      }}
                    >
                      Claimed
                    </button>
                  </div>
                    : web3.utils.fromWei(mine.toString(), "ether") > 0 ?
                      <div className="text-center my-2">
                        <button
                          className="btn btn-main"
                          onClick={takeBack}
                          style={{
                            display: "block"
                          }}
                        >
                          {approved
                            ? "Claim"
                            : "Approve & Claim"}
                        </button>
                      </div> 
                      : <p>You didn't Participate</p>
                    }
                </div>
            )
          ) : (
            <>
              <p>{"Please login to MetaMask or TrustWallet"}</p>
              <button className="btn btn-main" onClick={connect}>
                Connect
              </button>
            </>
          )
        ) : (
          <>
            <p>Install Metamask or TrustWallet</p>
            <p>OR</p>
            <button className="btn btn-main" onClick={setupWC}>
              Wallet Connect
            </button>
          </>
        )}
      </header>
    </div>
  );
}

export default App;
