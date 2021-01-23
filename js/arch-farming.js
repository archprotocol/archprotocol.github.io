class arch {
  async transfer(to, amount) {
    let contract = await getContract("arch");
    return await contract.methods.transfer(to, amount).send({
      gas: window.config.default_gas_amount,
      from: await window.web3.eth.getCoinbase(),
      gasPrice: window.config.default_gasprice_gwei * 1e9
    });
  }
  async totalSupply() {
    let contract = await getContract("arch");
    return await contract.methods.totalSupply().call();
  }
  async approve(spender, amount) {
    console.log("arch approve");
    let contract = await getContract("arch");
    const allowance = await contract.methods.allowance(address, spender).call();
    console.log("allowance", allowance);
    return await contract.methods.approve(spender, amount).send({
      gas: window.config.default_gas_amount,
      from: await getCoinbase(),
      gasPrice: window.config.default_gasprice_gwei * 1e9
    });
  }
  async balanceOf(address) {
    let contract = await getContract("arch");
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

  async depositarch(amount) {
    let arch_contract = await getContract("arch");
    let arch_LP_contract = await getContract("arch_LP");
    let arch_farming_contract = await getContract("arch_farming");
    let dir = await getCoinbase();
    let batch = new window.web3.eth.BatchRequest();
    const allowance = new BigNumber(
      await arch_LP_contract.methods
        .allowance(dir, window.config.arch_farming_address)
        .call()
    ).times(1e18);
    console.log("allowance arch", allowance.toString());
    console.log("amount arch", amount);
    if (allowance.isLessThanOrEqualTo(new BigNumber(amount))) {
      batch.add(
        arch_LP_contract.methods
          .approve(
            window.config.arch_farming_address,
            "999999999999999999999999999999999999999999999999999999999999999999"
          )
          .send.request({
            gas: await arch_LP_contract.methods
              .approve(
                window.config.arch_farming_address,
                "999999999999999999999999999999999999999999999999999999999999999999"
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

window.arch = new arch();
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
      "AGL Balance = <span style='float:right'><b>" +
        trim(dd, 6) +
        "</b> AGL</span>"
    );
    $("#arch-2balance2").html(
      "AGL Balance = <span style='float:right'><b>" +
        trim(dd, 6) +
        "</b> AGL</span>"
    );
  } else {
    $("#arch-balance2").html(
      "AGL Balance = <span style='float:right'><b>0.000000</b> AGL</span>"
    );
    $("#arch-2balance2").html(
      "AGL Balance = <span style='float:right'><b>0.000000</b> AGL</span>"
    );
  }
  e = new BigNumber(await o.methods.getPendingDivs(dir).call());
  if (e > 9999999999) {
    e = e.dividedBy(1e9);
    $("#arch-pendiente").html(
      "Rewards Pending = <span style='float:right'><b >" +
        e.decimalPlaces(6) +
        "</b> AGL</span>"
    );
  } else {
    $("#arch-pendiente").html(
      "Rewards Pending = <span style='float:right'><b >0.000000</b> AGL</span>"
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
      "</b> AGL</span>"
  );
  let h = new BigNumber(await o.methods.totalEarnedTokens(dir).call());
  h = h.dividedBy(1e9);
  $("#arch-claimed").html(
    "Your Rewads Claimed = <span style='float:right'><b >" +
      h.decimalPlaces(6) +
      "</b> AGL</span>"
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
          "</b> AGL</span>"
      );
    } else {
      $("#arch-pendiente").html(
        "Rewards Pending = <span style='float:right'><b>0.000000</b> AGL </span>"
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
    console.log("Calling archDeposit");
    let exito = await window.arch_farming.depositarch(amount3);
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
