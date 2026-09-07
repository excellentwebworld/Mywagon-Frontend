export function getOtpLabels(t: (key: string, fallback?: string) => string) {
  return {
    titlePrefix: t('register.otpEnterSentTo', 'Enter OTP sent to'),
    verify: t('register.verify', 'Verify'),
    resend: t('register.resendOtp', 'Resend OTP'),
    resendAfter: t('register.resendAfter', 'Resend OTP after'),
    didntReceive: t('register.didntReceiveOtp', "Didn't receive the OTP?"),
    enterOtp: t('register.enterOtp', 'Enter OTP'),
    invalidOtp: t('register.otpInvalid', 'Enter valid OTP'),
    resent: t('register.otpResent', 'OTP resent successfully'),
  };
}

export function extractApiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
