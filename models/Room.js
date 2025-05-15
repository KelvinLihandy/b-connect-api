import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  users: {
    type: [String],
    required: true,
    validate: {
      validator: function (val) {
        return Array.isArray(val) && val.length >= 1 && val.length <= 2;
      },
      message: '1 room isi 2 user'
    }
  },
  createdDate: {
    type: Date,
    default: Date.now
  },
  lastSeen: {
    type: [Date],
    default: () => [Date.now(), Date.now()]
  }
},
  { versionKey: false }
);

roomSchema.pre("save", async function (next) {
  next();
});

const Room = mongoose.model("Room", roomSchema);
export default Room