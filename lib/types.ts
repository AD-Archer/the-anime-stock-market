export interface User {
  id: string
  username: string
  email: string
  balance: number
  isAdmin: boolean
  createdAt: Date
  isBanned: boolean
}

export interface Stock {
  id: string
  characterName: string
  anime: string
  currentPrice: number
  createdBy: string
  createdAt: Date
  imageUrl: string
  description: string
  totalShares: number
  availableShares: number
}

export interface Transaction {
  id: string
  userId: string
  stockId: string
  type: "buy" | "sell"
  shares: number
  pricePerShare: number
  totalAmount: number
  timestamp: Date
}

export interface PriceHistory {
  id: string
  stockId: string
  price: number
  timestamp: Date
}

export interface Portfolio {
  userId: string
  stockId: string
  shares: number
  averageBuyPrice: number
}

export interface Comment {
  id: string
  userId: string
  animeId: string
  characterId?: string
  content: string
  timestamp: Date
}

export interface MarketDataPoint {
  timestamp: Date
  totalMarketCap: number
  averagePrice: number
}
