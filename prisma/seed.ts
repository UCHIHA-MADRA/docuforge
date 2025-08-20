import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create sample users
  const user1 = await prisma.user.upsert({
    where: { email: "john.doe@example.com" },
    update: {},
    create: {
      email: "john.doe@example.com",
      name: "John Doe",
      image:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: "jane.smith@example.com" },
    update: {},
    create: {
      email: "jane.smith@example.com",
      name: "Jane Smith",
      image:
        "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    },
  });

  // Create sample organization
  const organization = await prisma.organization.upsert({
    where: { slug: "acme-corp" },
    update: {},
    create: {
      name: "Acme Corporation",
      slug: "acme-corp",
      description: "A leading technology company",
    },
  });

  // Add users to organization
  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user1.id,
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      userId: user1.id,
      role: "owner",
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user2.id,
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      userId: user2.id,
      role: "admin",
    },
  });

  // Create sample documents
  const document1 = await prisma.document.create({
    data: {
      title: "Project Proposal 2024",
      content:
        "This is a comprehensive project proposal for the upcoming year...",
      status: "draft",
      visibility: "organization",
      authorId: user1.id,
      organizationId: organization.id,
      wordCount: 1500,
      readingTime: 6,
    },
  });

  const document2 = await prisma.document.create({
    data: {
      title: "Team Meeting Notes",
      content: "Key points from our weekly team meeting...",
      status: "published",
      visibility: "organization",
      authorId: user2.id,
      organizationId: organization.id,
      wordCount: 800,
      readingTime: 3,
    },
  });

  // Create sample files
  const file1 = await prisma.file.create({
    data: {
      name: "presentation.pdf",
      originalName: "presentation.pdf",
      mimeType: "application/pdf",
      size: 2048576,
      path: "/uploads/presentations/presentation.pdf",
      url: "https://example.com/uploads/presentations/presentation.pdf",
      uploadedBy: user1.id,
      userId: user1.id,
      organizationId: organization.id,
      processingStatus: "completed",
    },
  });

  const file2 = await prisma.file.create({
    data: {
      name: "image.jpg",
      originalName: "team-photo.jpg",
      mimeType: "image/jpeg",
      size: 1048576,
      path: "/uploads/images/image.jpg",
      url: "https://example.com/uploads/images/image.jpg",
      uploadedBy: user2.id,
      userId: user2.id,
      organizationId: organization.id,
      processingStatus: "completed",
    },
  });

  // Create sample tags
  const tag1 = await prisma.tag.upsert({
    where: { name: "proposal" },
    update: {},
    create: {
      name: "proposal",
      color: "#3B82F6",
    },
  });

  const tag2 = await prisma.tag.upsert({
    where: { name: "meeting" },
    update: {},
    create: {
      name: "meeting",
      color: "#10B981",
    },
  });

  // Link tags to documents
  await prisma.document.update({
    where: { id: document1.id },
    data: {
      tags: {
        connect: [{ id: tag1.id }],
      },
    },
  });

  await prisma.document.update({
    where: { id: document2.id },
    data: {
      tags: {
        connect: [{ id: tag2.id }],
      },
    },
  });

  // Create sample comments
  await prisma.comment.create({
    data: {
      content:
        "Great proposal! I think we should add more details about the timeline.",
      authorId: user2.id,
      documentId: document1.id,
    },
  });

  // Create user preferences
  await prisma.userPreferences.upsert({
    where: { userId: user1.id },
    update: {},
    create: {
      userId: user1.id,
      theme: "light",
      language: "en",
      timezone: "America/New_York",
    },
  });

  await prisma.userPreferences.upsert({
    where: { userId: user2.id },
    update: {},
    create: {
      userId: user2.id,
      theme: "dark",
      language: "en",
      timezone: "Europe/London",
    },
  });

  console.log("✅ Database seeded successfully!");
  console.log(`👥 Created ${2} users`);
  console.log(`🏢 Created ${1} organization`);
  console.log(`📄 Created ${2} documents`);
  console.log(`📁 Created ${2} files`);
  console.log(`🏷️  Created ${2} tags`);
  console.log(`💬 Created ${1} comment`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
