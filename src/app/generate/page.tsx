import { fetchGridData } from "@/lib/lastfm"
import Grid from "./grid"



export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {

  const params = await searchParams

  if (!params.user || typeof params.user !== "string") {
    return <div>problem</div>
  }

  if (!params.gridSize || typeof params.gridSize !== "string" || isNaN(parseInt(params.gridSize))) {
    params.gridSize = "5"
  }

  const data = await fetchGridData(params.user)


  
  return (
    <div>
      <Grid items={data} size={parseInt(params.gridSize)} />
    </div>
  )
}