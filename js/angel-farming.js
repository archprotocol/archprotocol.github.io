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
    console.log("agl LP approve");
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
    let agl_contract = await getContract("agl");
    let agl_LP_contract = await getContract("agl_LP");
    let agl_farming_contract = await getContract("agl_farming");
    let dir = await getCoinbase();
    let batch = new window.web3.eth.BatchRequest();
    const allowance = new BigNumber(
      await agl_LP_contract.methods
        .allowance(dir, window.config.agl_farming_address)
        .call()
    ).times(1e18);
    if (allowance.isLessThanOrEqualTo(new BigNumber(amount))) {
      batch.add(
        agl_LP_contract.methods
          .approve(
            window.config.agl_farming_address,
            "999999999999999999999999999999999999999999999999999999999999999999"
          )
          .send.request({
            gas: await agl_LP_contract.methods
              .approve(
                window.config.agl_farming_address,
                "999999999999999999999999999999999999999999999999999999999999999999"
              )
              .estimateGas({
                from: dir,
                to: window.config.agl_LP_address
              }),
            from: dir,
            gasPrice: window.config.default_gasprice_gwei * 1e9
          })
      );
    }
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

async function angelWallet() {
  let o = await getContract("agl_farming");
  let lp = await getContract("agl_LP");
  let dir = await getCoinbase();

  let b = new BigNumber(await o.methods.depositedTokens(dir).call());
  let bb = new BigNumber(await o.methods.totalTokens.call());
  if (b > 999999999999) {
    b = b.dividedBy(1e18);
    $("#angel-staked").html(
      "Deposited = <span style='float:right'><b >" +
        trim(b, 18) +
        "</b> UNI-V2</span>"
    );

    let bb = new BigNumber(await o.methods.totalTokens().call());
    bb = bb.dividedBy(1e18);
    bb = b.dividedBy(bb).multipliedBy(100);

    $("#angel-proportion").html(
      "Share % of Pool = <span style='float:right'><b >" +
        bb.decimalPlaces(4) +
        "</b> %</span>"
    );
  } else {
    $("#angel-staked").html(
      "Deposited = <span style='float:right'><b>0.000000</b> UNI-V2</span>"
    );
    $("#angel-proportion").html(
      "Share % of Pool =<span style='float:right'> <b>0.0000</b> %</span>"
    );
  }
  $("#angel-address").text("Your Address = " + dir);
  let d = new BigNumber(await lp.methods.balanceOf(dir).call());
  if (d > 999999999999) {
    d = d.dividedBy(1e18);
    $("#angel-balance").html(
      "LP Balance = <span style='float:right'><b>" +
        trim(d, 18) +
        "</b> UNI-V2</span>"
    );
  } else {
    $("#angel-balance").html(
      "LP Balance = <span style='float:right'><b>0.000000</b> UNI-V2</span>"
    );
  }
  let dd = new BigNumber(await window.agl.balanceOf(dir));
  if (dd > 999999999999) {
    dd = dd.dividedBy(1e9);
    $("#angel-balance2").html(
      "AGL Balance = <span style='float:right'><b>" +
        trim(dd, 6) +
        "</b> AGL</span>"
    );
    $("#angel-2balance2").html(
      "AGL Balance = <span style='float:right'><b>" +
        trim(dd, 6) +
        "</b> AGL</span>"
    );
  } else {
    $("#angel-balance2").html(
      "AGL Balance = <span style='float:right'><b>0.000000</b> AGL</span>"
    );
    $("#angel-2balance2").html(
      "AGL Balance = <span style='float:right'><b>0.000000</b> AGL</span>"
    );
  }
  e = new BigNumber(await o.methods.getPendingDivs(dir).call());
  if (e > 9999999999) {
    e = e.dividedBy(1e9);
    $("#angel-pendiente").html(
      "Rewards Pending = <span style='float:right'><b >" +
        e.decimalPlaces(6) +
        "</b> AGL</span>"
    );
  } else {
    $("#angel-pendiente").html(
      "Rewards Pending = <span style='float:right'><b >0.000000</b> AGL</span>"
    );
  }
  f = await o.methods.getNumberOfHolders().call();
  $("#angel-stakers").html(
    "Number of Farmers = <span style='float:right'><b>" + f + "</b></span>"
  );
  let g = new BigNumber(await o.methods.totalClaimedRewards().call());
  g = g.dividedBy(1e9);
  $("#angel-totalClaimed").html(
    "Total Rewards Claimed = <span style='float:right'><b>" +
      g.decimalPlaces(6) +
      "</b> AGL</span>"
  );
  let h = new BigNumber(await o.methods.totalEarnedTokens(dir).call());
  h = h.dividedBy(1e9);
  $("#angel-claimed").html(
    "Your Rewads Claimed = <span style='float:right'><b >" +
      h.decimalPlaces(6) +
      "</b> AGL</span>"
  );
  $("#angel-contractAddress").text(
    "Contract Adress = " + window.config.agl_farming_address
  );

  pendingInterval = setInterval(async function() {
    e = new BigNumber(await o.methods.getPendingDivs(dir).call());

    if (e > 9999999999) {
      e = e.dividedBy(1e9);
      $("#angel-pendiente").html(
        "Rewards Pending = <span style='float:right'><b >" +
          e.decimalPlaces(6) +
          "</b> AGL</span>"
      );
    } else {
      $("#angel-pendiente").html(
        "Rewards Pending = <span style='float:right'><b>0.000000</b> AGL </span>"
      );
    }
  }, 20000);
}

async function angelDeposit() {
  let o = await getContract("agl_farming");
  let q = await o.methods.getNumberOfHolders().call();
  let amount = $("#angel-value").val();
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
async function angelClaimRewards() {
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
  connectWallet();
}
async function angelWithdraw() {
  let o = await getContract("agl_farming");
  let dir = await getCoinbase();
  let amount = $("#angel-value").val();
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
  connectWallet();
}
