import { config } from 'dotenv';
import { resolve } from 'path';
import { MongoClient } from 'mongodb';

config({ path: resolve(process.cwd(), '.env') });

const faqs = [
  { question: 'What is FocusFlow?', answer: 'FocusFlow is a team productivity SaaS platform featuring Kanban boards with real-time collaboration, AI-powered assistance, Scrum/Sprint management, diagrams, whiteboards, and Stripe billing. It helps teams organize work, track progress, and ship faster.', category: 'General' },
  { question: 'What are the pricing plans?', answer: 'FocusFlow offers three plans: Free ($0/mo) with up to 3 workspaces and 3 boards each, Pro ($12/mo) with up to 10 workspaces, unlimited boards, AI chat, and Scrum features, and Pro Max ($29/mo) with unlimited everything plus priority support.', category: 'Pricing' },
  { question: 'How do I create a workspace?', answer: 'Go to your Dashboard and click the "Create Workspace" button. Give it a name and a unique slug. You can then add boards inside the workspace to start organizing your tasks.', category: 'Getting Started' },
  { question: 'How do I create a board?', answer: 'Open a workspace, then click "+ New Board". Each board comes with default columns (To Do, In Progress, Done). You can add, rename, or reorder columns as needed.', category: 'Boards' },
  { question: 'How do I invite team members?', answer: 'Open a workspace, go to the Members section, and click "Invite". Enter their email address and choose a role (Member or Admin). They will receive an invitation link to join.', category: 'Collaboration' },
  { question: 'What is the AI chat assistant?', answer: 'The AI chat assistant (available on Pro and Pro Max plans) can answer questions about FocusFlow, help with task management tips, and provide support. Click the chat bubble in the bottom-right corner to start a conversation. You can also request to talk to a human agent.', category: 'AI Features' },
  { question: 'How do I use Scrum/Sprint features?', answer: 'Scrum features are available on Pro and Pro Max plans. In your workspace, navigate to the Scrum page to create sprints, assign story points to cards, track velocity, and generate AI-powered sprint retrospectives.', category: 'Scrum' },
  { question: 'How do I change my subscription plan?', answer: 'Go to the Pricing page from the sidebar. Select the plan you want and complete the checkout via Stripe. Your new features will be available immediately. You can also manage your subscription from the billing portal.', category: 'Pricing' },
  { question: 'Can I use diagrams and whiteboards?', answer: 'Yes! FocusFlow includes a Diagram editor (powered by Mermaid) for flowcharts, sequence diagrams, and more, plus a Whiteboard feature (powered by Excalidraw) for freeform sketching and brainstorming. Access them from your workspace sidebar.', category: 'Features' },
  { question: 'How does real-time collaboration work?', answer: 'FocusFlow uses Pusher for real-time updates. When a team member moves a card, adds a comment, or makes any change, all connected users see the update instantly without refreshing the page.', category: 'Collaboration' },
  { question: 'How do I reset my password?', answer: 'FocusFlow uses Clerk for authentication. Click your profile icon in the sidebar, then go to "Manage Account" to change your password, update your email, or configure two-factor authentication.', category: 'Account' },
  { question: 'What card features are available?', answer: 'Cards support titles, descriptions, priority levels (urgent/high/medium/low), labels, assignees, due dates, story points, card types (task/bug/story/epic), comments, and drag-and-drop reordering between columns.', category: 'Boards' },
  { question: 'How do I contact support?', answer: 'Use the chat widget in the bottom-right corner of the app. Start with our AI assistant, and if you need human help, click "Talk to human" to connect with a support agent. Pro Max users get priority support.', category: 'Support' },
  { question: 'Is my data secure?', answer: 'Yes. FocusFlow uses MongoDB Atlas with encryption at rest, Clerk for secure authentication, Stripe for PCI-compliant payment processing, and all connections are encrypted with TLS. We never store your payment details directly.', category: 'Security' },
];

async function seed() {
  const client = new MongoClient(process.env.DATABASE_URL);
  await client.connect();
  const db = client.db();
  const now = new Date();
  const docs = faqs.map((f) => ({ ...f, createdAt: now, updatedAt: now }));
  const result = await db.collection('Faq').insertMany(docs);
  console.log(`Inserted ${result.insertedCount} FAQs`);
  await client.close();
}

seed().catch(console.error);
