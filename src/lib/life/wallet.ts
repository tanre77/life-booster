export type WalletMethod = "apple_pay" | "google_pay";
export type WalletOutcome = "authorized" | "unavailable" | "cancelled";

export async function requestWallet(opts: {
  method: WalletMethod;
  amountCents: number;
  label: string;
}): Promise<WalletOutcome> {
  if (typeof window === "undefined" || typeof PaymentRequest === "undefined") return "unavailable";
  const value = (opts.amountCents / 100).toFixed(2);
  const methodData: PaymentMethodData[] =
    opts.method === "google_pay"
      ? [
          {
            supportedMethods: "https://google.com/pay",
            data: {
              environment: "TEST",
              apiVersion: 2,
              apiVersionMinor: 0,
              merchantInfo: { merchantName: "Life Booster" },
              allowedPaymentMethods: [
                {
                  type: "CARD",
                  parameters: {
                    allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"],
                    allowedCardNetworks: ["AMEX", "DISCOVER", "MASTERCARD", "VISA"],
                  },
                  tokenizationSpecification: {
                    type: "PAYMENT_GATEWAY",
                    parameters: { gateway: "example", gatewayMerchantId: "exampleGatewayMerchantId" },
                  },
                },
              ],
            },
          },
        ]
      : [
          {
            supportedMethods: "https://apple.com/apple-pay",
            data: {
              version: 3,
              merchantIdentifier: "merchant.lifebooster.preview",
              merchantCapabilities: ["supports3DS"],
              supportedNetworks: ["visa", "masterCard", "amex", "discover"],
              countryCode: "US",
            },
          },
        ];
  try {
    const request = new PaymentRequest(methodData, {
      total: { label: opts.label, amount: { currency: "USD", value } },
    });
    if (request.canMakePayment) {
      const can = await request.canMakePayment();
      if (!can) return "unavailable";
    }
    await request.show();
    return "authorized";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    return "unavailable";
  }
}
