import { NextRequest, NextResponse } from "next/server";
import { stockService } from "@/lib/database";

export async function POST(request: NextRequest) {
  try {
    // Get the current count from the stocks collection
    const currentCount = await stockService.getCount(true); // true to force actual count

    // Initialize the metadata counter
    await stockService.initializeCount(currentCount);

    return NextResponse.json({
      success: true,
      message: `Metadata counter initialized with ${currentCount} stocks`,
      count: currentCount,
    });
  } catch (error) {
    console.error("Failed to initialize metadata counter:", error);
    return NextResponse.json(
      { error: "Failed to initialize metadata counter" },
      { status: 500 }
    );
  }
}
