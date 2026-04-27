import type { Node, Edge } from '@xyflow/react';

export interface DiagramTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  nodes: Node[];
  edges: Edge[];
}

export const DIAGRAM_TEMPLATES: DiagramTemplate[] = [
  {
    id: 'blank', name: 'Blank', description: 'Empty canvas', icon: '📄', color: '#94a3b8',
    nodes: [], edges: [],
  },
  {
    id: 'flowchart', name: 'Flowchart', description: 'Basic decision flow', icon: '🔀', color: '#6366f1',
    nodes: [
      { id: 't1', type: 'terminator', position: { x: 250, y: 0 }, data: { label: 'Start' } },
      { id: 't2', type: 'process', position: { x: 225, y: 120 }, data: { label: 'Process Input' } },
      { id: 't3', type: 'decision', position: { x: 230, y: 260 }, data: { label: 'Valid?' } },
      { id: 't4', type: 'process', position: { x: 225, y: 430 }, data: { label: 'Execute Task' } },
      { id: 't5', type: 'process', position: { x: 480, y: 280 }, data: { label: 'Handle Error' } },
      { id: 't6', type: 'terminator', position: { x: 250, y: 560 }, data: { label: 'End' } },
    ],
    edges: [
      { id: 'te1', source: 't1', target: 't2', animated: true },
      { id: 'te2', source: 't2', target: 't3', animated: true },
      { id: 'te3', source: 't3', target: 't4', animated: true, label: 'Yes' },
      { id: 'te4', source: 't3', target: 't5', animated: true, label: 'No', sourceHandle: 'right' },
      { id: 'te5', source: 't5', target: 't2', animated: true },
      { id: 'te6', source: 't4', target: 't6', animated: true },
    ],
  },
  {
    id: 'uml-class', name: 'UML Class', description: '3 classes with relationships', icon: '📐', color: '#a855f7',
    nodes: [
      { id: 'c1', type: 'class', position: { x: 50, y: 0 }, data: { label: 'User', properties: ['- id: string', '- name: string', '- email: string'], methods: ['+ getProfile(): Profile', '+ updateEmail(e: string): void'] } },
      { id: 'c2', type: 'class', position: { x: 350, y: 0 }, data: { label: 'Order', properties: ['- id: string', '- userId: string', '- total: number', '- status: OrderStatus'], methods: ['+ addItem(item: Item): void', '+ calculateTotal(): number'] } },
      { id: 'c3', type: 'class', position: { x: 200, y: 300 }, data: { label: 'OrderItem', properties: ['- id: string', '- productId: string', '- quantity: int', '- price: number'], methods: ['+ getSubtotal(): number'] } },
    ],
    edges: [
      { id: 'ce1', source: 'c1', target: 'c2', animated: true, label: '1..*' },
      { id: 'ce2', source: 'c2', target: 'c3', animated: true, label: '1..*' },
    ],
  },
  {
    id: 'c4-context', name: 'C4 Context', description: 'System context diagram', icon: '🏗️', color: '#1168bd',
    nodes: [
      { id: 'p1', type: 'c4Person', position: { x: 250, y: 0 }, data: { label: 'User', description: 'Uses the system' } },
      { id: 's1', type: 'c4System', position: { x: 220, y: 180 }, data: { label: 'My System', description: 'Main application' } },
      { id: 's2', type: 'c4System', position: { x: 0, y: 380 }, data: { label: 'Email Service', description: 'Sends emails' } },
      { id: 's3', type: 'c4System', position: { x: 450, y: 380 }, data: { label: 'Payment Gateway', description: 'Processes payments' } },
    ],
    edges: [
      { id: 'ce1', source: 'p1', target: 's1', animated: true, label: 'Uses' },
      { id: 'ce2', source: 's1', target: 's2', animated: true, label: 'Sends emails' },
      { id: 'ce3', source: 's1', target: 's3', animated: true, label: 'Processes payments' },
    ],
  },
  {
    id: 'erd', name: 'ERD', description: '3 tables with foreign keys', icon: '🗄️', color: '#06b6d4',
    nodes: [
      { id: 'e1', type: 'erdEntity', position: { x: 0, y: 0 }, data: { label: 'Users', fields: [{ name: 'id', type: 'INT', pk: true }, { name: 'email', type: 'VARCHAR(255)' }, { name: 'name', type: 'VARCHAR(100)' }, { name: 'created_at', type: 'TIMESTAMP' }] } },
      { id: 'e2', type: 'erdEntity', position: { x: 300, y: 0 }, data: { label: 'Orders', fields: [{ name: 'id', type: 'INT', pk: true }, { name: 'user_id', type: 'INT FK' }, { name: 'total', type: 'DECIMAL' }, { name: 'status', type: 'ENUM' }] } },
      { id: 'e3', type: 'erdEntity', position: { x: 600, y: 0 }, data: { label: 'Products', fields: [{ name: 'id', type: 'INT', pk: true }, { name: 'name', type: 'VARCHAR(255)' }, { name: 'price', type: 'DECIMAL' }, { name: 'stock', type: 'INT' }] } },
    ],
    edges: [
      { id: 'ee1', source: 'e1', target: 'e2', sourceHandle: 'right', targetHandle: 'left', animated: true, label: '1:N' },
      { id: 'ee2', source: 'e2', target: 'e3', sourceHandle: 'right', targetHandle: 'left', animated: true, label: 'N:M' },
    ],
  },
  {
    id: 'aws-arch', name: 'AWS Architecture', description: 'Cloud infrastructure', icon: '☁️', color: '#f59e0b',
    nodes: [
      { id: 'a1', type: 'c4Person', position: { x: 250, y: 0 }, data: { label: 'Users', description: 'End users' } },
      { id: 'a2', type: 'cloud', position: { x: 230, y: 140 }, data: { label: 'CloudFront (CDN)' } },
      { id: 'a3', type: 'loadBalancer', position: { x: 230, y: 260 }, data: { label: 'ALB' } },
      { id: 'a4', type: 'server', position: { x: 80, y: 380 }, data: { label: 'EC2 Instance 1' } },
      { id: 'a5', type: 'server', position: { x: 380, y: 380 }, data: { label: 'EC2 Instance 2' } },
      { id: 'a6', type: 'database', position: { x: 230, y: 520 }, data: { label: 'RDS PostgreSQL' } },
      { id: 'a7', type: 'queue', position: { x: 500, y: 520 }, data: { label: 'SQS Queue' } },
    ],
    edges: [
      { id: 'ae1', source: 'a1', target: 'a2', animated: true },
      { id: 'ae2', source: 'a2', target: 'a3', animated: true },
      { id: 'ae3', source: 'a3', target: 'a4', animated: true },
      { id: 'ae4', source: 'a3', target: 'a5', animated: true },
      { id: 'ae5', source: 'a4', target: 'a6', animated: true },
      { id: 'ae6', source: 'a5', target: 'a6', animated: true },
      { id: 'ae7', source: 'a5', target: 'a7', animated: true },
    ],
  },
  {
    id: 'microservices', name: 'Microservices', description: 'API Gateway + services', icon: '🔧', color: '#ec4899',
    nodes: [
      { id: 'm1', type: 'c4Person', position: { x: 280, y: 0 }, data: { label: 'Client', description: 'Mobile / Web' } },
      { id: 'm2', type: 'apiGateway', position: { x: 260, y: 150 }, data: { label: 'API Gateway' } },
      { id: 'm3', type: 'service', position: { x: 50, y: 300 }, data: { label: 'Auth Service' } },
      { id: 'm4', type: 'service', position: { x: 260, y: 300 }, data: { label: 'Order Service' } },
      { id: 'm5', type: 'service', position: { x: 470, y: 300 }, data: { label: 'Product Service' } },
      { id: 'm6', type: 'database', position: { x: 80, y: 450 }, data: { label: 'Auth DB' } },
      { id: 'm7', type: 'database', position: { x: 290, y: 450 }, data: { label: 'Order DB' } },
      { id: 'm8', type: 'database', position: { x: 500, y: 450 }, data: { label: 'Product DB' } },
      { id: 'm9', type: 'queue', position: { x: 260, y: 580 }, data: { label: 'Message Broker' } },
    ],
    edges: [
      { id: 'me1', source: 'm1', target: 'm2', animated: true },
      { id: 'me2', source: 'm2', target: 'm3', animated: true },
      { id: 'me3', source: 'm2', target: 'm4', animated: true },
      { id: 'me4', source: 'm2', target: 'm5', animated: true },
      { id: 'me5', source: 'm3', target: 'm6', animated: true },
      { id: 'me6', source: 'm4', target: 'm7', animated: true },
      { id: 'me7', source: 'm5', target: 'm8', animated: true },
      { id: 'me8', source: 'm4', target: 'm9', animated: true },
      { id: 'me9', source: 'm5', target: 'm9', animated: true },
    ],
  },
];
