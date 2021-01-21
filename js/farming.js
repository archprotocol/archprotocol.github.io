window.config = {
  agl_address: "0xF5ABAc65FE6B565F0445545A373E60e105ae601D", // token address
  agl_farming_address: "0x55805218bf2155cd9d531b7ad76951a4c3a573d3", // farming contract 1
  agl_lp_address: "0x984e72DE0b04ADb89199E75a016A1Edfeab23E56", // uni AGL 1
  etherscan_baseURL: "https://etherscan.io",
  default_gasprice_gwei: 150,
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
      wallet();
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

class agl {
  async transfer(to, amount) {
    let contract = await getContract("agl");
    return await contract.methods.transfer(to, amount).send({
      gas: window.config.default_gas_amount,
      from: await window.web3.eth.getCoinbase(),
      gasPrice: window.config.default_gasprice_gwei * 1e9
    });
  }
  async totalSupply() {
    let contract = await getContract("agl");
    return await contract.methods.totalSupply().call();
  }
  async approve(spender, amount) {
    let contract = await getContract("agl");
    return await contract.methods.approve(spender, amount).send({
      gas: window.config.default_gas_amount,
      from: await getCoinbase(),
      gasPrice: window.config.default_gasprice_gwei * 1e9
    });
  }
  async balanceOf(address) {
    let contract = await getContract("agl");
    return await contract.methods.balanceOf(address).call();
  }
}

class agl_LP {
  async transfer(to, amount) {
    let contract = await getContract("agl_LP");
    return await contract.methods.transfer(to, amount).send({
      gas: window.config.default_gas_amount,
      from: await window.web3.eth.getCoinbase(),
      gasPrice: window.config.default_gasprice_gwei * 1e9
    });
  }
  async approve(spender, amount) {
    let contract = await getContract("agl_LP");
    return await contract.methods.approve(spender, amount).send({
      gas: window.config.default_gas_amount,
      from: await getCoinbase(),
      gasPrice: window.config.default_gasprice_gwei * 1e9
    });
  }
  async balanceOf(address) {
    let contract = await getContract("agl_LP");
    return await contract.methods.balanceOf(address).call();
  }
}
class agl_farming {
  constructor() {
    [
      "owner",
      "cliffTime",
      "depositedTokens",
      "depositTime",
      "lastClaimedTime",
      "totalEarnedTokens",
      "getPendingDivs",
      "getNumberOfHolders",
      "getDepositorsList",
      "totalTokens"
    ].forEach(fn_name => {
      this[fn_name] = async function(...args) {
        let contract = await getContract("agl_farming");
        return await contract.methods[fn_name](...args).call();
      };
    });

    ["withdraw", "deposit", "claim"].forEach(fn_name => {
      this[fn_name] = async function(...args) {
        let contract = await getContract("agl_farming");
        return await contract.methods[fn_name](...args).send({
          gas: window.config.default_gas_amount,
          from: await getCoinbase(),
          gasPrice: window.config.default_gasprice_gwei * 1e9
        });
      };
    });
  }

  async depositagl(amount) {
    let agl_LP_contract = await getContract("agl_LP");
    let agl_farming_contract = await getContract("agl_farming");
    let dir = await getCoinbase();
    let batch = new window.web3.eth.BatchRequest();
    batch.add(
      agl_LP_contract.methods
        .approve(window.config.agl_farming_address, amount)
        .send.request({
          gas: await agl_LP_contract.methods
            .approve(window.config.agl_farming_address, amount)
            .estimateGas({
              from: dir,
              to: window.config.agl_LP_address
            }),
          from: dir,
          gasPrice: window.config.default_gasprice_gwei * 1e9
        })
    );
    batch.add(
      agl_farming_contract.methods.deposit(amount).send.request({
        gas: window.config.default_gas_amount,
        from: await getCoinbase(),
        gasPrice: window.config.default_gasprice_gwei * 1e9
      })
    );
    return await batch.execute();
  }
}

window.agl = new agl();
window.agl_LP = new agl_LP();
window.agl_farming = new agl_farming();

window.ethereum.on("accountsChanged", async function(accounts) {
  let dir = await getCoinbase();
  if (dir === null) {
    clearInfo();
  } else {
    connectWallet();
  }
});

async function clearInfo() {
  $("#staked").text("Staked = ");
  $("#address").text("Your Address = ");
  $("#balance").text("Balance (not-staked) = ");
  $("#balance2").text("Balance (not-staked) = ");
  $("#pendiente").text("Rewards pending = ");
  $("#stakers").text("Num Stakers = ");
  $("#totalClaimed").text("Total Rewards Claimed = ");
  $("#claimed").text("Your Rewads Claimed = ");
  $("#proportion").text("% Shares = ");
  clearInterval(pendingInterval);
}
var pendingInterval;

function trim(number, precision) {
  var array = number.toString().split(".");
  array.push(array.pop().substring(0, precision));
  var trimmedNumber = array.join(".");
  return trimmedNumber;
}

async function wallet() {
  console.log("Called wallet");
  let o = await getContract("agl_farming");
  let lp = await getContract("agl_LP");
  let dir = await getCoinbase();

  let b = new BigNumber(await o.methods.depositedTokens(dir).call());
  let bb = new BigNumber(await o.methods.totalTokens.call());
  if (b > 999999999999) {
    b = b.dividedBy(1e18);
    $("#staked").html(
      "Deposited = <span style='float:right'><b >" +
        trim(b, 6) +
        "</b> LP</span>"
    );

    let bb = new BigNumber(await o.methods.totalTokens().call());
    bb = bb.dividedBy(1e18);
    console.log(bb);
    bb = b.dividedBy(bb).multipliedBy(100);

    $("#proportion").html(
      "% Shares = <span style='float:right'><b >" +
        bb.decimalPlaces(4) +
        "</b> %</span>"
    );
  } else {
    $("#staked").html(
      "Deposited = <span style='float:right'><b>0.000000</b> LP</span>"
    );
    $("#proportion").html(
      "% Shares =<span style='float:right'> <b>0.0000</b> %</span>"
    );
  }
  $("#address").text("Your Address = " + dir);
  let d = new BigNumber(await lp.methods.balanceOf(dir).call());
  console.log("DDD", d);
  console.log("provider", web3.eth.currentProvider);
  if (d > 999999999999) {
    d = d.dividedBy(1e18);
    $("#balance").html(
      "Balance (not-staked) = <span style='float:right'><b>" +
        trim(d, 6) +
        "</b> LP</span>"
    );
  } else {
    $("#balance").html(
      "Balance (not-staked) = <span style='float:right'><b>0.000000</b> LP</span>"
    );
  }
  let dd = new BigNumber(await window.agl.balanceOf(dir));
  if (dd > 999999999999) {
    console.log("DDDi2", dd);
    $("#balance2").html(
      "Balance AGL (not-staked) = <span style='float:right'><b>" +
        trim(dd, 10) +
        "</b> AGL</span>"
    );
    $("#2balance2").html(
      "Balance AGL (not-staked) = <span style='float:right'><b>" +
        trim(dd, 10) +
        "</b> AGL</span>"
    );
  } else {
    $("#balance2").html(
      "Balance AGL (not-staked) = <span style='float:right'><b>0.000000</b> AGL</span>"
    );
    $("#2balance2").html(
      "Balance AGL (not-staked) = <span style='float:right'><b>0.000000</b> AGL</span>"
    );
  }
  e = new BigNumber(await o.methods.getPendingDivs(dir).call());
  if (e > 999999999999) {
    e = e.dividedBy(1e9);
    $("#pendiente").html(
      "Rewards pending = <span style='float:right'><b >" +
        e.decimalPlaces(6) +
        "</b> AGL</span>"
    );
  } else {
    $("#pendiente").html(
      "Rewards pending = <span style='float:right'><b >0.000000</b> AGL</span>"
    );
  }
  f = await o.methods.getNumberOfHolders().call();
  $("#stakers").html(
    "Num farmers = <span style='float:right'><b>" + f + "</b></span>"
  );
  let g = new BigNumber(await o.methods.totalClaimedRewards().call());
  g = g.dividedBy(1e9);
  $("#totalClaimed").html(
    "Total Rewards Claimed = <span style='float:right'><b>" +
      g.decimalPlaces(6) +
      "</b> AGL</span>"
  );
  let h = new BigNumber(await o.methods.totalEarnedTokens(dir).call());
  h = h.dividedBy(1e9);
  $("#claimed").html(
    "Your Rewads Claimed = <span style='float:right'><b >" +
      h.decimalPlaces(6) +
      "</b> AGL</span>"
  );
  $("#contractAddress").text(
    "Contract Adress = " + window.config.agl_farming_address
  );

  pendingInterval = setInterval(async function() {
    e = new BigNumber(await o.methods.getPendingDivs(dir).call());

    if (e > 999999999999) {
      e = e.dividedBy(1e18);
      $("#pendiente").html(
        "Rewards pending = <span style='float:right'><b >" +
          e.decimalPlaces(6) +
          "</b> AGL</span>"
      );
    } else {
      $("#pendiente").html(
        "Rewards pending = <span style='float:right'><b>0.000000</b> AGL </span>"
      );
    }
  }, 20000);
}

async function deposit() {
  let o = await getContract("agl_farming");
  let p = await o.methods.owner().call();
  console.log(p);
  let q = await o.methods.getNumberOfHolders().call();
  console.log(q);
  let amount = $("#value").val();
  console.log("amount", amount);
  let amount2 = new BigNumber(amount);
  let amount3 = Math.floor(amount2.multipliedBy(1e18)).toString();
  //let exito= await o.methods.deposit(amount).send({gas: window.config.default_gas_amount, from: await getCoinbase(), gasPrice: window.config.default_gasprice_gwei*1e9})
  try {
    let exito = await window.agl_farming.depositagl(amount3);
    console.log("Transaction complete?", exito);
  } catch (e) {
    console.log("Encountered an error:", e);
  }
  connectWallet();
}
async function claimRewards() {
  let o = await getContract("agl_farming");
  let dir = await getCoinbase();
  let exito = await o.methods.claim().send({
    gas: await o.methods.claim().estimateGas({
      from: dir,
      to: window.config.agl_farming_address
    }),
    from: dir,
    gasPrice: window.config.default_gasprice_gwei * 1e9
  });
  console.log(exito);
  connectWallet();
}
async function withdraw() {
  let o = await getContract("agl_farming");
  let dir = await getCoinbase();
  let amount = $("#value").val();
  let amount2 = new BigNumber(amount);
  let amount3 = Math.floor(amount2.multipliedBy(1e18)).toString();
  let exito = await o.methods.withdraw(amount3).send({
    gas: await o.methods.withdraw(amount3).estimateGas({
      from: dir,
      to: window.config.agl_farming_address
    }),
    from: dir,
    gasPrice: window.config.default_gasprice_gwei * 1e9
  });
  console.log(exito);
  connectWallet();
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
    wallet();
  });

  // Subscribe to chainId change
  provider.on("chainChanged", chainId => {
    wallet();
  });

  // Subscribe to networkId change
  provider.on("networkChanged", networkId => {
    wallet();
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
