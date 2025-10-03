import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { env } from "@/lib/env";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string || "bug";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File must be less than 5MB" }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    
    // Generate a unique path
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "png";
    const fileName = `${type}-reports/${randomUUID()}.${fileExt}`;

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from(env.SUPABASE_BUCKET_SCREENSHOTS)
      .upload(fileName, file, {
        contentType: file.type,
        cacheControl: "31536000", // 1 year
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload screenshot" },
        { status: 500 }
      );
    }

    // Get a public URL (this will be a signed URL that lasts a long time)
    const { data: signedData, error: signError } = await supabase.storage
      .from(env.SUPABASE_BUCKET_SCREENSHOTS)
      .createSignedUrl(fileName, 315360000); // 10 years

    if (signError || !signedData) {
      console.error("Sign error:", signError);
      return NextResponse.json(
        { error: "Failed to create signed URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: signedData.signedUrl,
      fileName,
    });
  } catch (error) {
    console.error("Error uploading screenshot:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

