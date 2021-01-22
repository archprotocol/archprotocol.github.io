window.config = {
  agl_address: "0xF5ABAc65FE6B565F0445545A373E60e105ae601D", // AGL TOKEN testnet
  arch_farming_address: "0x99c969b36e26afc87763023e4f974f3bf259308b", // farming contract ARCH/ETH testnet
  arch_lp_address: "0xB3F01C304274c6C69949732CE060755E6517396a", // ARCH/ETH LP POOL testnet
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
 * @param {"arch" | "arch_farming"} key
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
    console.log("agl approve");
    let contract = await getContract("agl");
    const allowance = await contract.methods.allowance(address, spender).call();
    console.log("allowance", allowance);
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

class arch_LP {
  async transfer(to, amount) {
    let contract = await getContract("arch_LP");
    return await contract.methods.transfer(to, amount).send({
      gas: window.config.default_gas_amount,
      from: await window.web3.eth.getCoinbase(),
      gasPrice: window.config.default_gasprice_gwei * 1e9
    });
  }
  async approve(spender, amount) {
    console.log("arch LP approve");
    let contract = await getContract("arch_LP");
    return await contract.methods.approve(spender, amount).send({
      gas: window.config.default_gas_amount,
      from: await getCoinbase(),
      gasPrice: window.config.default_gasprice_gwei * 1e9
    });
  }
  async balanceOf(address) {
    let contract = await getContract("arch_LP");
    return await contract.methods.balanceOf(address).call();
  }
}
class arch_farming {
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
        let contract = await getContract("arch_farming");
        return await contract.methods[fn_name](...args).call();
      };
    });

    ["withdraw", "deposit", "claim"].forEach(fn_name => {
      this[fn_name] = async function(...args) {
        let contract = await getContract("arch_farming");
        return await contract.methods[fn_name](...args).send({
          gas: window.config.default_gas_amount,
          from: await getCoinbase(),
          gasPrice: window.config.default_gasprice_gwei * 1e9
        });
      };
    });
  }

  async deposit(amount) {
    let agl_contract = await getContract("agl");
    let arch_LP_contract = await getContract("arch_LP");
    let arch_farming_contract = await getContract("arch_farming");
    let dir = await getCoinbase();
    let batch = new window.web3.eth.BatchRequest();
    const allowance = await agl_contract.methods
      .allowance(dir, window.config.arch_farming_address)
      .call();
    const allowance2 = await arch_LP_contract.methods
      .allowance(dir, window.config.arch_farming_address)
      .call();
    if (allowance2 < amount) {
      batch.add(
        arch_LP_contract.methods
          .approve(
            window.config.arch_farming_address,
            999999999999999999999999999999999999999999999999999999999999999999
          )
          .send.request({
            gas: await arch_LP_contract.methods
              .approve(
                window.config.arch_farming_address,
                999999999999999999999999999999999999999999999999999999999999999999
              )
              .estimateGas({
                from: dir,
                to: window.config.arch_LP_address
              }),
            from: dir,
            gasPrice: window.config.default_gasprice_gwei * 1e9
          })
      );
    }
    batch.add(
      arch_farming_contract.methods.deposit(amount).send.request({
        gas: window.config.default_gas_amount,
        from: await getCoinbase(),
        gasPrice: window.config.default_gasprice_gwei * 1e9
      })
    );
    return await batch.execute();
  }
}

window.agl = new agl();
window.arch_LP = new arch_LP();
window.arch_farming = new arch_farming();

async function archWallet() {
  let o = await getContract("arch_farming");
  let lp = await getContract("arch_LP");
  let dir = await getCoinbase();

  let b = new BigNumber(await o.methods.depositedTokens(dir).call());
  let bb = new BigNumber(await o.methods.totalTokens.call());
  if (b > 999999999999) {
    b = b.dividedBy(1e18);
    $("#arch-staked").html(
      "Deposited = <span style='float:right'><b >" +
        trim(b, 18) +
        "</b> UNI-V2</span>"
    );

    let bb = new BigNumber(await o.methods.totalTokens().call());
    bb = bb.dividedBy(1e18);
    bb = b.dividedBy(bb).multipliedBy(100);

    $("#arch-proportion").html(
      "Share % of Pool = <span style='float:right'><b >" +
        bb.decimalPlaces(4) +
        "</b> %</span>"
    );
  } else {
    $("#arch-staked").html(
      "Deposited = <span style='float:right'><b>0.000000</b> UNI-V2</span>"
    );
    $("#arch-proportion").html(
      "Share % of Pool =<span style='float:right'> <b>0.0000</b> %</span>"
    );
  }
  $("#arch-address").text("Your Address = " + dir);
  let d = new BigNumber(await lp.methods.balanceOf(dir).call());
  if (d > 999999999999) {
    d = d.dividedBy(1e18);
    $("#arch-balance").html(
      "LP Balance = <span style='float:right'><b>" +
        trim(d, 18) +
        "</b> UNI-V2</span>"
    );
  } else {
    $("#arch-balance").html(
      "LP Balance = <span style='float:right'><b>0.000000</b> UNI-V2</span>"
    );
  }
  let dd = new BigNumber(await window.arch.balanceOf(dir));
  if (dd > 999999999999) {
    dd = dd.dividedBy(1e9);
    $("#arch-balance2").html(
      "ARCH Balance = <span style='float:right'><b>" +
        trim(dd, 6) +
        "</b> ARCH</span>"
    );
    $("#arch-2balance2").html(
      "ARCH Balance = <span style='float:right'><b>" +
        trim(dd, 6) +
        "</b> ARCH</span>"
    );
  } else {
    $("#arch-balance2").html(
      "ARCH Balance = <span style='float:right'><b>0.000000</b> ARCH</span>"
    );
    $("#arch-2balance2").html(
      "ARCH Balance = <span style='float:right'><b>0.000000</b> ARCH</span>"
    );
  }
  e = new BigNumber(await o.methods.getPendingDivs(dir).call());
  if (e > 9999999999) {
    e = e.dividedBy(1e9);
    $("#arch-pendiente").html(
      "Rewards Pending = <span style='float:right'><b >" +
        e.decimalPlaces(6) +
        "</b> ARCH</span>"
    );
  } else {
    $("#arch-pendiente").html(
      "Rewards Pending = <span style='float:right'><b >0.000000</b> ARCH</span>"
    );
  }
  f = await o.methods.getNumberOfHolders().call();
  $("#arch-stakers").html(
    "Number of Farmers = <span style='float:right'><b>" + f + "</b></span>"
  );
  let g = new BigNumber(await o.methods.totalClaimedRewards().call());
  g = g.dividedBy(1e9);
  $("#arch-totalClaimed").html(
    "Total Rewards Claimed = <span style='float:right'><b>" +
      g.decimalPlaces(6) +
      "</b> ARCH</span>"
  );
  let h = new BigNumber(await o.methods.totalEarnedTokens(dir).call());
  h = h.dividedBy(1e9);
  $("#arch-claimed").html(
    "Your Rewads Claimed = <span style='float:right'><b >" +
      h.decimalPlaces(6) +
      "</b> ARCH</span>"
  );
  $("#arch-contractAddress").text(
    "Contract Adress = " + window.config.arch_farming_address
  );

  pendingInterval = setInterval(async function() {
    e = new BigNumber(await o.methods.getPendingDivs(dir).call());

    if (e > 9999999999) {
      e = e.dividedBy(1e9);
      $("#arch-pendiente").html(
        "Rewards Pending = <span style='float:right'><b >" +
          e.decimalPlaces(6) +
          "</b> ARCH</span>"
      );
    } else {
      $("#arch-pendiente").html(
        "Rewards Pending = <span style='float:right'><b>0.000000</b> ARCH </span>"
      );
    }
  }, 20000);
}

async function archDeposit() {
  let o = await getContract("arch_farming");
  let q = await o.methods.getNumberOfHolders().call();
  let amount = $("#arch-value").val();
  let amount2 = new BigNumber(amount);
  let amount3 = Math.floor(amount2.multipliedBy(1e18)).toString();
  //let exito= await o.methods.deposit(amount).send({gas: window.config.default_gas_amount, from: await getCoinbase(), gasPrice: window.config.default_gasprice_gwei*1e9})
  try {
    let exito = await window.arch_farming.deposit(amount3);
    console.log("Transaction complete?", exito);
  } catch (e) {
    console.log("Encountered an error:", e);
  }
  connectWallet();
}
async function archClaimRewards() {
  let o = await getContract("arch_farming");
  let dir = await getCoinbase();
  let exito = await o.methods.claim().send({
    gas: await o.methods.claim().estimateGas({
      from: dir,
      to: window.config.arch_farming_address
    }),
    from: dir,
    gasPrice: window.config.default_gasprice_gwei * 1e9
  });
  connectWallet();
}
async function archWithdraw() {
  let o = await getContract("arch_farming");
  let dir = await getCoinbase();
  let amount = $("#arch-value").val();
  let amount2 = new BigNumber(amount);
  let amount3 = Math.floor(amount2.multipliedBy(1e18)).toString();
  let exito = await o.methods.withdraw(amount3).send({
    gas: await o.methods.withdraw(amount3).estimateGas({
      from: dir,
      to: window.config.arch_farming_address
    }),
    from: dir,
    gasPrice: window.config.default_gasprice_gwei * 1e9
  });
  connectWallet();
}
