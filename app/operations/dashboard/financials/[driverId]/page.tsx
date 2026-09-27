import { DriverWalletLedger } from "@/components/financials/driver-wallet-ledger"

export default async function DriverWalletLedgerPage({
  params,
}: {
  params: Promise<{ driverId: string }>
}) {
  const { driverId } = await params
  return <DriverWalletLedger driverId={driverId} />
}
