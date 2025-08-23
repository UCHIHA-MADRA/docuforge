import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../[...nextauth]/route";
import { getUserWithRoles } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user with roles using our permissions system
    const userWithRoles = await getUserWithRoles(session.user.id);

    if (!userWithRoles) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Transform the data to match our frontend interface
    const userData = {
      id: userWithRoles.id,
      email: userWithRoles.email,
      name: userWithRoles.name,
      image: userWithRoles.image,
      organizationRoles:
        userWithRoles.organizationRoles?.map((member) => ({
          organizationId: member.organizationId,
          role: member.role,
        })) || [],
      documentRoles:
        userWithRoles.documentRoles?.map((collab) => ({
          documentId: collab.documentId,
          role: collab.role,
        })) || [],
    };

    return NextResponse.json(userData);
  } catch (error) {
    console.error("Error fetching user data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Optional: Add endpoint to refresh specific user permissions
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action } = await request.json();

    if (action === "refresh") {
      // Force refresh user data from database
      const userWithRoles = await getUserWithRoles(session.user.id);

      if (!userWithRoles) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const userData = {
        id: userWithRoles.id,
        email: userWithRoles.email,
        name: userWithRoles.name,
        image: userWithRoles.image,
        organizationRoles:
          userWithRoles.organizationRoles?.map((member) => ({
            organizationId: member.organizationId,
            role: member.role,
          })) || [],
        documentRoles:
          userWithRoles.documentRoles?.map((collab) => ({
            documentId: collab.documentId,
            role: collab.role,
          })) || [],
      };

      return NextResponse.json(userData);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error in user data POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
