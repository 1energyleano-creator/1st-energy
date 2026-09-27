import { WalletTopUpChat } from "@/components/wallet/wallet-topup-chat"

export default async function WalletTopUpChatPage({
  params,
}: {
  params: Promise<{ requestId: string }>
}) {
  const { requestId } = await params
  return <WalletTopUpChat requestId={requestId} />
}
