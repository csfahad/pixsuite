import Razorpay from "razorpay";
import { RequestError } from "./request-error.server";

let client: Razorpay | undefined;
export function razorpayClient(): Razorpay {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret)
        throw new RequestError(503, "Payments are temporarily unavailable");
    return (client ??= new Razorpay({ key_id, key_secret }));
}
