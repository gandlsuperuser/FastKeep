import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/db/prisma";
import { z } from "zod";

const uploadDocumentSchema = z.object({
  type: z.enum(["w9", "salesPermit", "other"]),
  fileData: z.string().min(1, "File data is required"),
  fileName: z.string().min(1, "File name is required"),
});

// POST - Upload / update a document for a customer
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = uploadDocumentSchema.parse(body);

    const customer = await prisma.customer.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const updateData: any = {};
    const now = new Date();

    if (validatedData.type === "w9") {
      updateData.w9Url = validatedData.fileData;
      updateData.w9Name = validatedData.fileName;
      updateData.w9UploadedAt = now;
    } else if (validatedData.type === "salesPermit") {
      updateData.salesPermitUrl = validatedData.fileData;
      updateData.salesPermitName = validatedData.fileName;
      updateData.salesPermitUploadedAt = now;
    } else {
      // Append to general documents array
      const existingDocs = Array.isArray(customer.documents) ? customer.documents : [];
      const newDoc = {
        id: `doc_${Date.now()}`,
        name: validatedData.fileName,
        url: validatedData.fileData,
        uploadedAt: now.toISOString(),
      };
      updateData.documents = [...existingDocs, newDoc];
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: `${validatedData.type === "w9" ? "W-9" : validatedData.type === "salesPermit" ? "Sales Permit" : "Document"} uploaded successfully`,
      customer: updatedCustomer,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Error uploading customer document:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a document from a customer
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "w9" | "salesPermit"

    if (!type || (type !== "w9" && type !== "salesPermit")) {
      return NextResponse.json(
        { error: "Invalid document type. Must be 'w9' or 'salesPermit'" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (type === "w9") {
      updateData.w9Url = null;
      updateData.w9Name = null;
      updateData.w9UploadedAt = null;
    } else if (type === "salesPermit") {
      updateData.salesPermitUrl = null;
      updateData.salesPermitName = null;
      updateData.salesPermitUploadedAt = null;
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: `${type === "w9" ? "W-9" : "Sales Permit"} removed successfully`,
      customer: updatedCustomer,
    });
  } catch (error) {
    console.error("Error removing customer document:", error);
    return NextResponse.json(
      { error: "Failed to remove document" },
      { status: 500 }
    );
  }
}
