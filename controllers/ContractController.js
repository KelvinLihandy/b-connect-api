import mongoose from "mongoose";
import dotenv from "dotenv";
import Contract from "../models/Contract.js";
// import Midtrans from "midtrans-client";
import { nanoid } from "nanoid";
import Transaction from "../models/Transaction.js";
import { cryptHash } from "../utils/HashUtils.js";
import { User } from "../models/User.js";
import { upload } from "../config/multer.js";
import { uploadSingle } from "../utils/DriveUtil.js";
dotenv.config();

// const snap = new Midtrans.Snap({
//   isProduction: false,
//   serverKey: process.env.SERVER_KEY,
//   clien
// });


//unused
// const createTransaction = async (req, res) => {
//   const { gigId, selectedPackage } = req.body;
//   const user = req.user;

//   const [first, ...rest] = user.name.trim().split(" ");
//   const transactionId = `TR-${nanoid(4)}-${nanoid(8)}`
//   const authKey = btoa(`${process.env.SERVER_KEY}:`)
//   const payload = {
//     transaction_details: {
//       order_id: transactionId,
//       gross_amount: String(selectedPackage.price)
//     },
//     customer_details: {
//       first_name: first,
//       last_name: rest,
//       email: user.email,
//       phone: user.phoneNumber,
//     },
//     // enabled_payments: ["gopay"],
//     // gopay: {
//     //   enable_callback: true,
//     //   callback_url: "http://gopay.com",
//     //   tokenization: false,
//     //   country_code: "62"
//     // },
//     callbacks: {
//       finish: "javascript:void(0)",
//       error: "javascript:void(0)",
//       pending: "javascript:void(0)"
//     }
//   }
//   console.log("payload", payload)
//   const response = await fetch("https://app.midtrans.com/snap/v1/transactions", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       "Accept": "application/json",
//       "Authorization": `Basic ${authKey}`,
//     },
//     body: JSON.stringify(payload)
//   })
//   const data = await response.json();
//   console.log("data res", response);
//   if (response.status !== 201) {
//     return res.status(500).json({
//       status: "error",
//       message: "gagal create transaction"
//     });
//   }
//   const transactionData = {
//     orderId: transactionId,
//     amount: selectedPackage.price,
//     customer_name: user.name,
//     customer_picture: user.picture,
//     customer_email: user.email,
//     customer_phone: user.phoneNumber,
//     gigId: gigId,
//     package: selectedPackage,
//     snap_token: data.token,
//     snap_redirect: data.redirect_url
//   }
//   const newTransaction = await Transaction.create(transactionData);
//   return res.status(201).json({
//     status: "success transaction create",
//     transaction: newTransaction
//   });
// }

//unused
// const transactionNotification = async (req, res) => {
//   const data = req.body;

//   console.log("transaction", data);
//   try {
//     if (data.order_id.startsWith("payment_notif_test_")) {
//       return res.status(200).json({ status: "test", message: "Test notification received" });
//     }

//     const transaction = await Transaction.findOne({ orderId: data.order_id });
//     const contract = await Contract.findOne({ orderId: data.order_id });
//     if (!transaction) {
//       return res.status(404).json({
//         status: "error",
//         message: "Transaction not found"
//       });
//     }
//     if (transaction) {
//       const hash = cryptHash(`${data.order_id}${data.status_code}${data.gross_amount}${process.env.SERVER_KEY}`, "sha512", "hex")
//       if (data.signature_key !== hash) {
//         return res.status(403).json({
//           status: "error",
//           message: "Invalid signature"
//         });
//       }
//       let res = null;
//       let transactionStatus = data.transaction_status;
//       let fraudStatus = data.fraud_status;
//       let create = false;
//       if (transactionStatus === "capture" && fraudStatus === "accept") {
//         await Transaction.findOneAndUpdate(
//           { orderId: data.order_id },
//           { $set: { status: "paid" } }
//         );
//         create = true;
//       }
//       else if (transactionStatus == "settlement") {
//         await Transaction.findOneAndUpdate(
//           { orderId: data.order_id },
//           { $set: { status: "paid" } },
//         );
//         create = true;
//       }
//       else if (["cancel", "deny", "expired"].includes(transactionStatus)) {
//         await Transaction.findOneAndUpdate(
//           { orderId: data.order_id },
//           { $set: { status: "cancel" } }
//         );
//       }
//       else if (transactionStatus == "pending") {
//         await Transaction.findOneAndUpdate(
//           { orderId: data.order_id },
//           { $set: { status: "pending" } },
//         );
//       }
//       if (create && !contract) {
//         const user = await User.findOne({ email: transaction.customer_email });
//         await createContract(data.order_id, transaction.gigId, transaction.package, user);
//       }
//     }

//     return res.status(200).send("Ok");
//   }
//   catch (err) {
//     console.log("error catch notif midtrans", err);
//     return res.status(500).json({
//       status: "error",
//       error: "error catch notif midtrans"
//     })
//   }
// }

const createContract = [
  upload.single('proof'),
  async (req, res) => {
    const { gigId, selectedPackage } = req.body;
    const userId = req.user.id;
    const proof = req.file;

    try {
      const orderId = `TR-${nanoid(4)}-${nanoid(8)}`
      const proofId = await uploadSingle(proof, orderId, process.env.DRIVE_PROOF_ID);
      const newContract = new Contract({
        orderId: orderId,
        gigId: gigId,
        userId: userId,
        package: JSON.parse(selectedPackage),
        proofId: proofId
      });
      await newContract.save();
      console.log("new contract created", newContract);
      return res.status(201).json(newContract);
    }
    catch (err) {
      console.log("error create contract", err);
      return res.status(500).json({ error: "error create contract" })
    }
  }
]

export {
  // createTransaction, 
  // transactionNotification, 
  createContract
}