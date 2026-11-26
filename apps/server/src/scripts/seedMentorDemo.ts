import { prisma, connectPrisma, disconnectPrisma } from '../config/prisma.js';
import { hashPassword } from '../utils/password.js';

async function seedMentorDemo() {
  await connectPrisma();
  console.log('Connected to database. Starting mentor demo seed...');

  // 1. Find Mentor
  const mentor = await prisma.user.findUnique({
    where: { email: 'mentor1@forgeloom.dev' },
    include: { mentorProfile: true },
  });
  if (!mentor || !mentor.collegeId) {
    throw new Error('mentor1@forgeloom.dev not found or has no collegeId.');
  }

  // 2. Find Student
  const student = await prisma.user.findUnique({
    where: { email: 'student1@forgeloom.dev' },
    include: { studentProfile: true },
  });
  if (!student || !student.studentProfile) {
    throw new Error('student1@forgeloom.dev not found or has no studentProfile.');
  }

  // 3. Find Trainer
  const trainer = await prisma.user.findUnique({
    where: { email: 'trainer1@forgeloom.dev' },
  });

  // Ensure Student is linked to Mentor
  if (mentor.mentorProfile && student.studentProfile.mentorId !== mentor.mentorProfile.id) {
    await prisma.studentProfile.update({
      where: { id: student.studentProfile.id },
      data: { mentorId: mentor.mentorProfile.id },
    });
    console.log('Linked student1 to mentor1 profile.');
  }

  // 4. Upsert Problem Statement
  let problemStatement = await prisma.problemStatement.findFirst({
    where: { title: 'AI-Driven FinTech Portfolio Platform' },
  });
  if (!problemStatement) {
    problemStatement = await prisma.problemStatement.create({
      data: {
        title: 'AI-Driven FinTech Portfolio Platform',
        description: 'Scalable portfolio analytics, algorithmic trading indicators, and risk monitoring.',
        overview: 'An institutional-grade web app built with React, Node.js, and Postgres.',
        source: 'industry',
        domain: 'FinTech & AI',
        tags: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AI/ML'],
        teamSize: 4,
        durationWeeks: 6,
        difficulty: 'hard',
        status: 'open',
        featured: true,
        postedBy: mentor.id,
      },
    });
    console.log('Created Problem Statement:', problemStatement.title);
  } else {
    console.log('Problem Statement already exists:', problemStatement.title);
  }

  // 5. Upsert Team Alpha
  let team = await prisma.team.findFirst({
    where: { name: 'Team Alpha', collegeId: mentor.collegeId },
    include: { members: true, sprints: true },
  });

  if (!team) {
    team = await prisma.team.create({
      data: {
        name: 'Team Alpha',
        collegeId: mentor.collegeId,
        mentorId: mentor.id,
        trainerId: trainer?.id ?? null,
        problemStatementId: problemStatement.id,
        members: {
          create: [
            {
              studentUserId: student.id,
              studentProfileId: student.studentProfile.id,
            },
          ],
        },
      },
      include: { members: true, sprints: true },
    });
    console.log('Created Team Alpha for mentor1.');
  } else {
    // Update team to ensure mentorId, trainerId, problemStatementId are set
    team = await prisma.team.update({
      where: { id: team.id },
      data: {
        mentorId: mentor.id,
        trainerId: trainer?.id ?? null,
        problemStatementId: problemStatement.id,
      },
      include: { members: true, sprints: true },
    });

    // Ensure student1 is a member
    const isMember = team.members.some((m) => m.studentUserId === student.id);
    if (!isMember) {
      await prisma.teamMember.create({
        data: {
          teamId: team.id,
          studentUserId: student.id,
          studentProfileId: student.studentProfile.id,
        },
      });
      console.log('Added student1 to Team Alpha.');
    }
  }

  // 6. Ensure Sprints for Team Alpha
  const sprintCount = await prisma.sprint.count({ where: { teamId: team.id } });
  if (sprintCount === 0) {
    const now = new Date();
    await prisma.sprint.createMany({
      data: [
        {
          teamId: team.id,
          cycleNumber: 1,
          status: 'in_progress',
          startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          progressPercent: 75,
        },
        {
          teamId: team.id,
          cycleNumber: 2,
          status: 'not_started',
          startDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
          progressPercent: 0,
        },
        {
          teamId: team.id,
          cycleNumber: 3,
          status: 'not_started',
          startDate: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000),
          progressPercent: 0,
        },
      ],
    });
    console.log('Created 3 sprints for Team Alpha.');
  } else {
    // Ensure sprint 1 is submitted with 75% progress
    await prisma.sprint.updateMany({
      where: { teamId: team.id, cycleNumber: 1 },
      data: { status: 'submitted', progressPercent: 75 },
    });
    console.log('Verified Sprint 1 status is submitted (ready for mentor review).');

    const sprint1 = await prisma.sprint.findFirst({
      where: { teamId: team.id, cycleNumber: 1 },
    });
    if (sprint1) {
      const existingSub = await prisma.milestoneSubmission.findFirst({
        where: { sprintId: sprint1.id },
      });
      if (!existingSub) {
        await prisma.milestoneSubmission.create({
          data: {
            sprintId: sprint1.id,
            teamId: team.id,
            artifactUrls: ['https://github.com/forgeloom/alpha-fintech-demo'],
            demoDate: new Date(),
          },
        });
        console.log('Created milestone submission for Team Alpha Sprint 1.');
      }
    }
  }

  // 6b. Ensure Student Two and Team Beta (for real 50% On Track / 50% At Risk distribution)
  let student2: any = await prisma.user.findUnique({
    where: { email: 'student2@forgeloom.dev' },
    include: { studentProfile: true },
  });

  if (!student2) {
    const passwordHash = await hashPassword('test1234');
    student2 = await prisma.user.create({
      data: {
        email: 'student2@forgeloom.dev',
        passwordHash,
        role: 'student',
        collegeId: mentor.collegeId,
        studentProfile: {
          create: {
            name: 'Student Two',
            mentorId: mentor.mentorProfile?.id,
            builderScore: 780,
          },
        },
      },
      include: { studentProfile: true },
    });
    console.log('Created student2@forgeloom.dev.');
  } else {
    if (student2.collegeId !== mentor.collegeId) {
      await prisma.user.update({
        where: { id: student2.id },
        data: { collegeId: mentor.collegeId },
      });
    }
    if (mentor.mentorProfile && student2.studentProfile && student2.studentProfile.mentorId !== mentor.mentorProfile.id) {
      await prisma.studentProfile.update({
        where: { id: student2.studentProfile.id },
        data: { mentorId: mentor.mentorProfile.id },
      });
    }
    console.log('Verified student2 is linked to mentor1.');
  }

  let problemStatement2 = await prisma.problemStatement.findFirst({
    where: { title: 'Autonomous Multi-Agent Coordination Protocol' },
  });
  if (!problemStatement2) {
    problemStatement2 = await prisma.problemStatement.create({
      data: {
        title: 'Autonomous Multi-Agent Coordination Protocol',
        description: 'Decentralized agent communication, task auctions, and Byzantine fault consensus.',
        overview: 'An institutional-grade multi-agent engine built with TypeScript, Node.js, and Postgres.',
        source: 'industry',
        domain: 'Distributed Systems & AI',
        tags: ['TypeScript', 'Node.js', 'Distributed Systems', 'AI Agents'],
        teamSize: 4,
        durationWeeks: 6,
        difficulty: 'hard',
        status: 'open',
        featured: true,
        postedBy: mentor.id,
      },
    });
    console.log('Created Problem Statement 2:', problemStatement2.title);
  }

  let teamBeta = await prisma.team.findFirst({
    where: { name: 'Team Beta', collegeId: mentor.collegeId },
    include: { members: true, sprints: true },
  });

  if (!teamBeta) {
    const now = new Date();
    teamBeta = await prisma.team.create({
      data: {
        name: 'Team Beta',
        collegeId: mentor.collegeId,
        mentorId: mentor.id,
        trainerId: trainer?.id ?? null,
        problemStatementId: problemStatement2.id,
        members: student2.studentProfile ? {
          create: [
            {
              studentUserId: student2.id,
              studentProfileId: student2.studentProfile.id,
            },
          ],
        } : undefined,
        sprints: {
          create: [
            {
              cycleNumber: 1,
              status: 'reviewed',
              startDate: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
              endDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
              progressPercent: 100,
            },
            {
              cycleNumber: 2,
              status: 'in_progress',
              startDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
              endDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
              progressPercent: 50,
            },
            {
              cycleNumber: 3,
              status: 'not_started',
              startDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
              endDate: new Date(now.getTime() + 24 * 24 * 60 * 60 * 1000),
              progressPercent: 0,
            },
          ],
        },
      },
      include: { members: true, sprints: true },
    });
    console.log('Created Team Beta for mentor1 with student2.');
  } else {
    // Ensure student2 is in Team Beta
    if (student2.studentProfile && !teamBeta.members.some((m) => m.studentUserId === student2.id)) {
      await prisma.teamMember.create({
        data: {
          teamId: teamBeta.id,
          studentUserId: student2.id,
          studentProfileId: student2.studentProfile.id,
        },
      });
      console.log('Added student2 to Team Beta.');
    }
  }

  // 7. Ensure Today's Booking Session
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const existingTodaySession = await prisma.booking.findFirst({
    where: {
      mentorId: mentor.id,
      scheduledAt: { gte: todayStart, lte: todayEnd },
      status: 'upcoming',
    },
  });

  if (!existingTodaySession) {
    const sessionTime = new Date();
    sessionTime.setHours(sessionTime.getHours() + 2);
    sessionTime.setMinutes(0);
    sessionTime.setSeconds(0);

    await prisma.booking.create({
      data: {
        requesterId: student.id,
        mentorId: mentor.id,
        title: 'Sprint 1 Architecture Review & Live Demo',
        scheduledAt: sessionTime,
        durationMinutes: 45,
        mode: 'Google Meet',
        status: 'upcoming',
        agenda: [
          'Review database schema & Prisma relations',
          'Inspect API endpoints & authentication',
          'Plan Sprint 2 deployment milestone',
        ],
        meetingLink: 'https://meet.google.com/abc-demo-loom',
      },
    });
    console.log('Created today upcoming session for mentor1 with student1.');
  } else {
    console.log('Today session already exists:', existingTodaySession.title);
  }

  // 8. Ensure a completed session exists for stats
  const pastSession = await prisma.booking.findFirst({
    where: {
      mentorId: mentor.id,
      status: 'completed',
    },
  });

  if (!pastSession) {
    const pastTime = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    await prisma.booking.create({
      data: {
        requesterId: student.id,
        mentorId: mentor.id,
        title: 'Initial Project Ideation & Scope Definition',
        scheduledAt: pastTime,
        durationMinutes: 30,
        mode: 'Google Meet',
        status: 'completed',
        agenda: ['Discuss product requirements', 'Identify tech stack components'],
      },
    });
    console.log('Created completed past session for stats.');
  }

  // 9. Ensure Notifications
  const existingNotifications = await prisma.notification.findMany({
    where: { userId: mentor.id },
  });

  if (existingNotifications.length === 0) {
    await prisma.notification.createMany({
      data: [
        {
          userId: mentor.id,
          type: 'booking_created',
          title: 'New session booked by Student One',
          body: 'Scheduled for Sprint 1 architecture review.',
        },
        {
          userId: mentor.id,
          type: 'milestone_reviewed',
          title: 'Team Alpha reached 75% on Sprint 1',
          body: 'Check the teams dashboard to review progress and provide feedback.',
        },
      ],
    });
    console.log('Created seed notifications for mentor1.');
  }

  console.log('Mentor demo seed completed successfully!');
  await disconnectPrisma();
}

seedMentorDemo()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error seeding mentor demo data:', err);
    process.exit(1);
  });
