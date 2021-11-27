import './App.css';
import {useState, useEffect} from 'react'
import {ADDRESS, ABI, NETWORK_ID} from './constants';
import WalletConnect from "walletconnect";

function App() {
  
  const $ = window.jQuery;

  const [error, setError] = useState("");
  const [errorA, setErrorA] = useState("");
  const [errorAB, setErrorAB] = useState(false);
  const [softcap, setSoftcap] = useState(0);
  const [hardcap, setHardcap] = useState(0);
  const [raised, setRaised] = useState(0);
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(0);
  const [mine, setMine] = useState(0);
  const [isWhitelisted, setIsWhiteListed] = useState(false);
  const [onlyWhitelisted, setOnlyWhitelisted] = useState(false);
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState(0);
  const [contract, setContract] = useState("");
  const [web3, setWeb3] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
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
    const  setup = async (_contract) => {
      let hasStarted = await _contract.methods.openingTime().call();
      let hasClosed = await _contract.methods.hasClosed().call()
      let finalized = await _contract.methods
        .isFinalized()
        .call()

      if (hasClosed || finalized) {
        setCompleted(true);
      }
      if (hasStarted <= Date.now() / 1000) {
        setStarted(true);
      }
    }
    if(web3!==""){
      const presale = new web3.eth.Contract(ABI, ADDRESS);
      presale.methods.goal().call().then(setSoftcap);
      presale.methods.cap().call().then(setHardcap);
      presale.methods.weiRaised().call().then(setRaised);
      presale.methods.minContribution().call().then(setMin);
      presale.methods.maxContribution().call().then(setMax);
      presale.methods.onlyWhitelisted().call().then(setOnlyWhitelisted);
      setup(presale);
      setContract(presale);

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

  useEffect(()=>{
    if(web3!==""){
      const __amount = web3.utils.toWei(amount.toString(), "ether");
      if (+__amount > +max) {
        setErrorA("Amount cannot be greater than max");
        setErrorAB(true);
      } else if (+__amount < +min) {
        setErrorA("Amount cannot be less than min");
        setErrorAB(true);
      } else {
        setErrorA("");
        setErrorAB(false);
      }
    }
  },[web3, amount, min, max])

  const handleChange = (e)=>{
    setAmount(+e.target.value);
  }

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
            `Wrong network, Switch to Smart Chain ${NETWORK_ID === 97 && "Testnet"}`
          );
          return;
        }
        if (connected) {
          const _mine = await contract.methods.getUserContribution(account).call();
          const _isWhitelisted = await contract.methods.whitelist(account).call();

          setMine(_mine);
          setIsWhiteListed(_isWhitelisted);
          
          
          setError(
            `You've bought ${web3.utils.fromWei(
              _mine.toString(),
              "ether"
            )} out of ${web3.utils.fromWei(max.toString(), "ether")} BNB`
          );
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

  const buy = async (e) => {
    e.preventDefault();
    $(e.target).text("Buying...");
    $(e.target).attr("disabled", true);
    try{
      await contract.methods
      .buyTokens(account)
      .send({ from: account, value: web3.utils.toWei(amount.toString(), "ether") });
    }catch(e){
      $(e.target).text("Buy Tokens");
      $(e.target).removeAttr("disabled");      
    }
    $(e.target).text("Buy Tokens");
    $(e.target).removeAttr("disabled");
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
            ) : started ? (
              !completed ? (
                <div className="rounded bg-dark p-5 opacity">
                  <div style={{ fontSize: "16px" }}>
                    Soft Cap: {web3.utils.fromWei(softcap.toString(), "ether")}{" "}
                    BNB
                    <br />
                    Hard Cap: {web3.utils.fromWei(
                      hardcap.toString(),
                      "ether"
                    )}{" "}
                    BNB
                    <br />
                    Raised: {web3.utils.fromWei(raised.toString(), "ether")} BNB
                    <br />
                    Your Contribution:{" "}
                    {web3.utils.fromWei(mine.toString(), "ether")} BNB
                    <br />
                    Min. Buy: {web3.utils.fromWei(min.toString(), "ether")} BNB
                    <br />
                    Max. Buy: {web3.utils.fromWei(max.toString(), "ether")} BNB
                    <p>{onlyWhitelisted && isWhitelisted ? error : ""}</p>
                    <p>{onlyWhitelisted && isWhitelisted ? errorA : ""}</p>
                  </div>
                  {!onlyWhitelisted || (onlyWhitelisted && isWhitelisted) ? (
                    <>
                      <input
                        type="number"
                        placeholder="Enter amount"
                        onChange={handleChange}
                        style={{
                          width: "100%",
                          border: "none",
                          padding: "14px 28px",
                          fontSize: "16px",
                          textAlign: "center",
                        }}
                      />
                      <div className="text-center">
                      <button
                        onClick={buy}
                        style={{
                          marginTop: "10px",
                          display:
                            web3.utils.fromWei(mine.toString(), "ether") >=
                              web3.utils.fromWei(max.toString(), "ether") ||
                            errorAB
                              ? "none"
                              : "inline",
                          width: "70%",
                          border: "none",
                          backgroundColor: "#04AA6D",
                          padding: "14px 28px",
                          fontSize: "16px",
                          cursor: "pointer",
                          textAlign: "center",
                        }}
                      >
                        Buy Tokens
                      </button>
                      </div >
                    </>
                  ) : (
                    <p>You are not whitelisted, wait for PUBLIC opening</p>
                  )}
                </div>
              ) : (
                <p>Public sale has ended</p>
              )
            ) : (
              <p>Public sale isn't live yet</p>
            )
          ) : (
            <>
              <p>{"Please login to MetaMask or TrustWallet"}</p>
              <button
                onClick={connect}
                style={{
                  marginTop: "10px",
                  display: "block",
                  border: "none",
                  backgroundColor: "#04AA6D",
                  padding: "14px 28px",
                  fontSize: "16px",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                Connect
              </button>
            </>
          )
        ) : (
          <>
            <p>Install Metamask or TrustWallet</p>
            <p>OR</p>
            <button onClick={setupWC}
                  style={{
                    marginTop: "10px",
                    display: "block",
                    border: "none",
                    backgroundColor: "#04AA6D",
                    padding: "14px 28px",
                    fontSize: "16px",
                    cursor: "pointer",
                    textAlign: "center",
            }}>Wallet Connect</button>
          </>
        )}
      </header>
    </div>
  );
}

export default App;
