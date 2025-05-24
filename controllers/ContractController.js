import mongoose from "mongoose";
import dotenv from "dotenv";
import Contract from "../models/Contract.js";
import Midtrans from "midtrans-client";
import { nanoid } from "nanoid";
import Transaction from "../models/Transaction.js";
import { cryptHash } from "../utils/HashUtils.js";
import { User } from "../models/User.js";
dotenv.config();

let snap = new Midtrans.Snap({
  isProduction: false,
  serverKey: process.env.SERVER_KEY,
  clientKey: process.env.CLIENT_KEY
});

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
      finish: "javascript:void(0)",
      error: "javascript:void(0)",
      pending: "javascript:void(0)"
    }
  }
  // console.log("payload", payload)
  // const response = await fetch("https://app.midtrans.com/snap/v1/transactions", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //     "Accept": "application/json",
  //     "Authorization": `Basic ${authKey}`,
  //   },
  //   body: JSON.stringify(payload)
  // })
  // const data = await response.json();
  // if (response.status !== 201) {
  //   return res.status(500).json({
  //     status: "error",
  //     message: "gagal create transaction"
  //   });
  // }
  let token = "";
  let url = "";
  snap.createTransaction(JSON.stringify(payload))
    .then((transaction) => {
      token = transaction.token;
      url = transaction.redirectUrl;
    })
    .catch((error) => {
      console.error('Midtrans transaction creation failed:', error.message || error);
      return res.status(500).json({
        status: "error",
        message: "gagal create transaction"
      });
    });

  const transactionData = {
    orderId: transactionId,
    amount: selectedPackage.price,
    customer_name: user.name,
    customer_picture: user.picture,
    customer_email: user.email,
    customer_phone: user.phoneNumber,
    gigId: gigId,
    package: selectedPackage,
    snap_token: token,
    snap_redirect: url
  }
  const newTransaction = await Transaction.create(transactionData);
  return res.status(201).json({
    status: "success transaction create",
    transaction: newTransaction
  });
}


const transactionNotification = async (req, res) => {
  const notificationJson = req.body;

  console.log("transaction", notificationJson);
  console.log("Headers:", req.headers);
  try {
    const statusResponse = await snap.transaction.notification(notificationJson);
    const orderId = statusResponse.order_id;
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;

    console.log(`Transaction notification received. Order ID: ${orderId}. Transaction status: ${transactionStatus}. Fraud status: ${fraudStatus}`);

    if (orderId.startsWith("payment_notif_test_")) {
      return res.status(200).json({ status: "test", message: "Test notification received" });
    }

    const transaction = await Transaction.findOne({ orderId });
    const contract = await Contract.findOne({ orderId });

    if (!transaction) {
      return res.status(404).json({ status: "error", message: "Transaction not found" });
    }
    const hash = cryptHash(`${orderId}${statusResponse.status_code}${statusResponse.gross_amount}${process.env.SERVER_KEY}`, "sha512", "hex")
    if (statusResponse.signature_key !== hash) {
      return res.status(403).json({
        status: "error",
        message: "Invalid signature"
      });
    }
    let create = false;

    if (transactionStatus === 'capture') {
      if (fraudStatus === 'challenge') {
        await Transaction.findOneAndUpdate(
          { orderId },
          { $set: { status: "challenge" } }
        );
        create = true;
      } else if (fraudStatus === 'accept') {
        await Transaction.findOneAndUpdate(
          { orderId },
          { $set: { status: "success" } }
        );
        create = true;
      }
    } else if (transactionStatus === 'settlement') {
      await Transaction.findOneAndUpdate(
        { orderId },
        { $set: { status: "paid" } }
      );
      create = true;
    } else if (['cancel', 'deny', 'expired'].includes(transactionStatus)) {
      await Transaction.findOneAndUpdate(
        { orderId },
        { $set: { status: "cancel" } }
      );
    } else if (transactionStatus === 'pending') {
      await Transaction.findOneAndUpdate(
        { orderId },
        { $set: { status: "pending" } }
      );
    }

    if (create && !contract) {
      const user = await User.findOne({ email: transaction.customer_email });
      await createContract(orderId, transaction.gigId, transaction.selectedPackage, user);
    }

    // return res.status(200).json({ status: "success", message: "Notification handled" });
    return res.status(200).send("OK");
  } catch (err) {
    console.log("error catch notif midtrans", err);
    return res.status(500).json({
      status: "error",
      error: "error catch notif midtrans"
    })
  }
};

const createContract = async (orderId, gigId, selectedPackage, user) => {
  try {
    const newContract = new Contract({
      orderId: orderId,
      gigId: gigId,
      userId: user.id,
      package: selectedPackage
    })
    await newContract.save();
  }
  catch (err) {
    console.log("error create contract", err);
    return res.status(500).json({ error: "error create contract" })
  }
}

export { createTransaction, transactionNotification, createContract }