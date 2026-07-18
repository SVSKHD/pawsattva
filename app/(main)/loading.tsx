import Paw from "../pawsattva.png"
import AdminLoader from "@/components/loader"

export default function Loading() {
  return (
    <AdminLoader
      img={Paw}
      title="Opening your PawSattva space"
      subtitle="Fetching the latest wellness experience for you..."
    />
  )
}
