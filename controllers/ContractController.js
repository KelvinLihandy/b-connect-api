import mongoose from "mongoose";
import dotenv from "dotenv";
import Contract from "../models/Contract.js";
import Midtrans from "midtrans-client";
import { nanoid } from "nanoid";
import Transaction from "../models/Transaction.js";
import { cryptHash } from "../utils/HashUtils.js";
dotenv.config();

const snap = new Midtrans.Snap({
  isProduction: false,
  serverKey: process.env.SERVER_KEY
});

//masukin data ke snap
//return transaction key
//kalau transaksi oke baru save db

const createTransaction = async (req, res) => {
  const { gigId, selectedPackage } = req.body;
  const user = req.user;

  const [first, ...rest] = user.name.trim().split(" ");
  const transactionId = `TR-${nanoid(4)}-${nanoid(8)}`
  const authKey = btoa(`${process.env.SERVER_KEY}:`)
  const payload = {
    transaction_details: {
      order_id: transactionId,
      gross_amount: String(selectedPackage.price)
    },
    customer_details: {
      first_name: first,
      last_name: rest,
      email: user.email,
      phone: user.phoneNumber,
    },
    enabled_payments: ["gopay"],
    gopay: {
      enable_callback: true,
      callback_url: "http://gopay.com",
      tokenization: false,
      country_code: "62"
    },
    callbacks: {
      //route si budi
      finish: "http://localhost:5173/",
      error: "http://localhost:5173/",
      pending: "http://localhost:5173/"
    }
  }
  console.log("payload", payload)
  const response = await fetch("https://app.sandbox.midtrans.com/snap/v1/transactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Basic ${authKey}`,
    },
    body: JSON.stringify(payload)
  })
  const data = await response.json();
  console.log("data res", data);
  if (response.status !== 201) {
    return res.status(500).json({
      status: "error",
      message: "gagal create transaction"
    });
  }
  const transactionData = {
    orderId: transactionId,
    amount: selectedPackage.price,
    customer_name: user.name,
    customer_picture: user.picture,
    customer_email: user.email,
    customer_phone: user.phoneNumber,
    snap_token: data.token,
    snap_redirect: data.redirect_url
  }
  const newTransaction = await Transaction.create(transactionData);
  await createContract(transactionId, data.gigId, data.selectedPackage, user)
  return res.status(201).json({
    status: "success",
    transaction: newTransaction
  });
}


const transactionNotification = async (req, res) => {
  const data = req.body;

  console.log("transaction", data);
  try {
    const transaction = await Transaction.findById(data.order_id);
    const contract = await Contract.findById(data.order_id);
    if (transaction) {
      const hash = cryptHash(`${data.order_id}${data.status_code}${data.gross_amount}${process.env.SERVER_KEY}`, "sha512", "hex")
      if (data.signature !== hash) return {
        status: "error",
        message: "Invalid signature"
      }
      let res = null;
      let transactionStatus = data.transaction_status;
      let fraudStatus = data.fraud_status;
      if (transactionStatus == "capture") {
        if (fraudStatus == "accept") {
          await Transaction.findOneAndUpdate(
            { orderId: data.order_id },
            { $set: { status: "paid" } },
            { new: true }
          );
          await Contract.findOneAndUpdate(
            { orderId: data.orderId },
            { $set: { status: "paid" } },
            { new: true }
          )
        }
      }
      else if (transactionStatus == "settlement") {
        await Transaction.findByIdAndUpdate(
          data.order_id,
          { $set: { status: "paid" } },
          { new: true }
        );
        await Contract.findOneAndUpdate(
          { orderId: data.orderId },
          { $set: { status: "paid" } },
          { new: true }
        )
      }
      else if (transactionStatus == "cancel" || tranasctionStatus == "deny" || transactionStatus == "expired") {
        await Transaction.findByIdAndUpdate(
          data.order_id,
          { $set: { status: "cancel" } },
          { new: true }
        );
        await Contract.findOneAndUpdate(
          { orderId: data.orderId },
          { $set: { status: "cancel" } },
          { new: true }
        )
      }
      else if (transactionStatus == "pending") {
        await Transaction.findByIdAndUpdate(
          data.order_id,
          { $set: { status: "pending" } },
          { new: true }
        );
        await Contract.findOneAndUpdate(
          { orderId: data.orderId },
          { $set: { status: "pending" } },
          { new: true }
        )
      }
    }

    return res.status(200).json({
      status: "success",
      message: "ok"
    })
  }
  catch (err) {
    console.log("error catch notif midtrans", err);
    return res.status(500).json({
      status: "error",
      error: "error catch notif midtrans"
    })
  }
}

const createContract = async (orderId, gigId, selectedPackage, user) => {
  try {
    const newContract = new Contract({
      orderId: orderId,
      gigId: gigId,
      userId: user.id,
      package: selectedPackage
    })
    newContract.save();
  }
  catch (err) {
    console.log("error create contract", err);
    return res.status(500).json({ error: "error create contract" })
  }
}

export { createTransaction, transactionNotification, createContract }