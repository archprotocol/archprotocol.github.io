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
    let contract = await getContract("arch");
    const allowance = await contract.methods.allowance(address, spender).call();
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
    $("#arch-staked").text(trim(b, 18));

    let bb = new BigNumber(await o.methods.totalTokens().call());
    bb = bb.dividedBy(1e18);
    bb = b.dividedBy(bb).multipliedBy(100);

    $("#arch-proportion").text(bb.decimalPlaces(4));
  } else {
    $("#arch-staked").text("0.00000");
    $("#arch-proportion").text("0.00000");
  }
  $("#arch-address").text(dir);
  let d = new BigNumber(await lp.methods.balanceOf(dir).call());
  if (d > 999999999999) {
    d = d.dividedBy(1e18);
    $("#arch-lp-balance").text(trim(d, 18));
  } else {
    $("#arch-lp-balance").text("0.00000");
  }
  let dd = new BigNumber(await window.arch.balanceOf(dir));
  if (dd > 999999999999) {
    dd = dd.dividedBy(1e9);
    $("#arch-balance").text(trim(dd, 6));
  } else {
    $("#arch-balance").text("0.00000");
  }
  e = new BigNumber(await o.methods.getPendingDivs(dir).call());
  if (e > 9999999999) {
    e = e.dividedBy(1e9);
    $("#arch-pending").text(e.decimalPlaces(6));
  } else {
    $("#arch-pending").text("0.00000");
  }
  f = await o.methods.getNumberOfHolders().call();
  $("#arch-stakers").text(f);
  let g = new BigNumber(await o.methods.totalClaimedRewards().call());
  g = g.dividedBy(1e9);
  $("#arch-totalClaimed").text(g.decimalPlaces(6));
  let h = new BigNumber(await o.methods.totalEarnedTokens(dir).call());
  h = h.dividedBy(1e9);
  $("#arch-claimed").text(h.decimalPlaces(6));
  $("#arch-contractAddress").text(window.config.arch_farming_address);

  pendingInterval = setInterval(async function() {
    e = new BigNumber(await o.methods.getPendingDivs(dir).call());

    if (e > 9999999999) {
      e = e.dividedBy(1e18);
      $("#arch-pending").text(e.decimalPlaces(6));
    } else {
      $("#arch-pending").text("0.00000");
    }
  }, 20000);
}

async function archDeposit() {
  let o = await getContract("arch_farming");
  let q = await o.methods.getNumberOfHolders().call();
  let amount = $("#arch-value").val();
  let amount2 = new BigNumber(amount);
  let amount3 = Math.floor(amount2.multipliedBy(1e18)).toString();
  try {
    let result = await window.arch_farming.depositarch(amount3);
  } catch (e) {
    console.log("Encountered an error:", e);
  }
  connectWallet();
}
async function archClaimRewards() {
  let o = await getContract("arch_farming");
  let dir = await getCoinbase();
  let result = await o.methods.claim().send({
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
  let result = await o.methods.withdraw(amount3).send({
    gas: await o.methods.withdraw(amount3).estimateGas({
      from: dir,
      to: window.config.arch_farming_address
    }),
    from: dir,
    gasPrice: window.config.default_gasprice_gwei * 1e9
  });
  connectWallet();
}
