window.config = {
  agl_address: "0xd1B9E138516EE74ee27949eb1B58584A4bEDE267", 
  agl_farming_address: "0x48dd6d34411fef3661894cded50c993c2d82041d", 
  agl_lp_address: "0xd91911131afe19526d45fc403c514be55c404c39", 
  arch_address: "0x97f3D01339215916994c9f40f61b89921c613b4d",
  arch_farming_address: "0xff10e9e2cd7c0206b72ca9fc145c2654479c8803", 
  arch_lp_address: "0xef841312c610a6340a0235e4e26ca7a0ecb09635", 
  etherscan_baseURL: "https://etherscan.io",
  default_gasprice_gwei: 100,
  default_gas_amount: 300000,
  circulating_supply: "3,299"
};

window.cached_contracts = {};

// function to connect metamask
async function connectWallet() {
  if (window.ethereum) {
    window.web3 = new Web3(window.ethereum);
    try {
      await window.ethereum.enable();
      console.log("Connected!");
      angelWallet();
      archWallet();
      document.querySelector("#prepare").style.display = "none";
      document.querySelector("#connected").style.display = "block";

      return true;
    } catch (e) {
      console.error(e);
      throw new Error("User denied wallet connection!");
    }
  } else if (window.web3) {
    window.web3 = new Web3(window.web3.currentProvider);
    console.log("connected to old web3");
    return true;
  } else {
    $("#drink").css("visibility", "hidden");
    throw new Error("No web3 detected!");
  }
}

/**
 *
 * @param {"agl" | "agl_farming"} key
 */
async function getContract(key) {
  console.log("Called");
  console.log(await web3.version);
  let ABI = window[key + "_ABI"];
  let address = window.config[key.toLowerCase() + "_address"];
  if (!window.cached_contracts[key]) {
    window.cached_contracts[key] = new window.web3.eth.Contract(ABI, address, {
      from: await window.web3.eth.getCoinbase()
    });
  }

  return window.cached_contracts[key];
}

function getCoinbase() {
  return window.web3.eth.getCoinbase();
}

window.ethereum.on("accountsChanged", async function(accounts) {
  let dir = await getCoinbase();
  if (dir === null) {
    clearInfo();
  } else {
    connectWallet();
  }
});

async function clearInfo() {
  $("#arch-staked").text("0");
  $("#arch-address").text("0x...");
  $("#arch-lp-balance").text("0");
  $("#arch-balance").text("0");
  $("#arch-pending").text("0");
  $("#arch-stakers").text("0");
  $("#arch-totalClaimed").text("0");
  $("#arch-claimed").text("0");
  $("#arch-proportion").text("0");
  $("#angel-staked").text("0");
  $("#angel-address").text("0x...");
  $("#angel-lp-balance").text("0");
  $("#angel-balance").text("0");
  $("#angel-pending").text("0");
  $("#angel-stakers").text("0");
  $("#angel-totalClaimed").text("0");
  $("#angel-claimed").text("0");
  $("#angel-proportion").text("0");
  clearInterval(pendingInterval);
}
var pendingInterval;

function trim(number, precision) {
  var array = number.toString().split(".");
  array.push(array.pop().substring(0, precision));
  var trimmedNumber = array.join(".");
  return trimmedNumber;
}

const Web3Modal = window.Web3Modal.default;
const WalletConnectProvider = window.WalletConnectProvider.default;
const Fortmatic = window.Fortmatic;
const evmChains = window.evmChains;

// Web3modal instance
let web3Modal;
// Chosen wallet provider given by the dialog window
let provider;

// Address of the selected account
let selectedAccount;

let ConnectedContract;
async function onDisconnect() {
  console.log("Killing the wallet connection", provider);

  if (provider.close) {
    await provider.close();

    // If the cached provider is not cleared,
    // WalletConnect will default to the existing session
    // and does not allow to re-scan the QR code with a new wallet.
    // Depending on your use case you may want or want not his behavir.
    await web3Modal.clearCachedProvider();
    provider = null;
  }

  selectedAccount = null;

  // Set the UI back to the initial state
  document.querySelector("#prepare").style.display = "block";
  document.querySelector("#connected").style.display = "none";
  clearInfo();
}
async function onConnect() {
  console.log("Opening a dialog", web3Modal);
  try {
    provider = await web3Modal.connect();
    console.log("Got provider:", provider);
  } catch (e) {
    console.log("Could not get a wallet connection", e);
    return;
  }

  // Subscribe to accounts change
  provider.on("accountsChanged", accounts => {
    connectWallet();
  });

  // Subscribe to chainId change
  provider.on("chainChanged", chainId => {
    connectWallet();
  });

  // Subscribe to networkId change
  provider.on("networkChanged", networkId => {
    connectWallet();
  });

  await connectWallet();
}
function init() {
  const providerOptions = {
    walletconnect: {
      package: WalletConnectProvider
    }
  };

  web3Modal = new Web3Modal({
    cacheProvider: true, // optional
    providerOptions,
    disableInjectedProvider: false // optional. For MetaMask / Brave / Opera.
  });

  if (web3Modal.cachedProvider) {
    onConnect();
  }
}
window.addEventListener("load", async () => {
  init();
  document.querySelector("#btn-connect").addEventListener("click", onConnect);
  document
    .querySelector("#btn-disconnect")
    .addEventListener("click", onDisconnect);
});
