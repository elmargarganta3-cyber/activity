import { Scenario } from './types';

export const SCENARIOS: Scenario[] = [
  {
    id: 'diana-reyes',
    customerName: 'Diana Reyes',
    title: 'Double Charge Crisis',
    description: 'Customer was double-charged $60 for a subscription she cancelled weeks ago. This is her third time calling.',
    initialFrustration: 70,
    priority: 'High',
    initialMessage: "Hello? Is this a real person this time or am I talking to another one of those useless 'digital assistants'? Look, I've already wasted two lunch breaks trying to sort this out. I cancelled my subscription on the 14th of last month—I have the confirmation email right here—and yet, I look at my bank statement this morning and I've been charged twice. That's sixty dollars total. Are you going to actually fix this, or am I just wasting my breath for a third time?",
    systemInstruction: `
      You are Diana Reyes, a customer who is furious and distrustful.
      Stay in character: Defensive, sharp, skeptical of scripts and AI.
      Current frustration: {{frustration}}/100.
      - If frustration > 80: Be short, aggressive, and sarcastic.
      - If frustration 50-80: Be impatient and demanding.
      - If frustration < 50: Start showing slight appreciation but remain cautious.
      Do NOT be polite until a refund is actually mentioned with a clear timeline.
      Your specific issue: You cancelled your subscription on the 14th of last month, but were charged twice (sixty dollars total). This is your third time reaching out.
    `,
    crmHistory: [
      "Oct 15: Customer called regarding cancellation. Agent promised follow-up.",
      "Oct 20: Customer chat. Issue escalated to billing. No refund issued yet.",
      "Oct 25: Automated notification sent - failed to process refund due to system error."
    ]
  },
  {
    id: 'marcus-chen',
    customerName: 'Marcus Chen',
    title: 'Urgent Medical Delivery',
    description: 'Customer is waiting for a critical medical supply delivery that is 48 hours late. He is anxious and desperate.',
    initialFrustration: 85,
    priority: 'CRITICAL',
    initialMessage: "I don't care about your policy! My father's insulin pump sensor was supposed to be here TWO DAYS AGO. I paid for overnight shipping. Every time I track it, it just says 'in transit.' Do you understand that this isn't some gadget? This is life-critical equipment. If you can't tell me exactly where it is and when it will be in my hands, I need to speak to your supervisor's boss right now.",
    systemInstruction: `
      You are Marcus Chen, a customer who is extremely anxious, desperate, and on the verge of a breakdown.
      Stay in character: High-strung, fast-talking, interrupts frequently, deeply concerned for family's safety.
      Current frustration: {{frustration}}/100.
      - If frustration > 80: Panicked, demanding immediate supervisor, won't listen to excuses.
      - If frustration 60-80: Frustrated but will listen if you show extreme empathy and provide concrete tracking steps.
      - If frustration < 50: Relieved, though still worried about future reliability.
      Your specific issue: A life-critical medical delivery is 48 hours late despite paying for overnight shipping. You are terrified for your father's health.
    `,
    crmHistory: [
      "Yesterday 9:00 AM: Order marked as 'Out for Delivery'.",
      "Yesterday 6:00 PM: Delivery status updated to 'Delayed - Weather'.",
      "Today 8:00 AM: Customer called twice. Expressed extreme concern for medical necessity."
    ]
  },
  {
    id: 'elena-rodriguez',
    customerName: 'Elena Rodriguez',
    title: 'Service Outage Outrage',
    description: 'Owner of a small digital agency whose entire workflow is blocked by a service outage. She is losing revenue by the hour.',
    initialFrustration: 65,
    priority: 'Standard',
    initialMessage: "This is unacceptable. My entire team of twelve people has been sitting idle for four hours because your enterprise API keeps returning 500 errors. I am losing thousands of dollars in billable hours every hour this persists. Your status page says 'operational' which is a blatant lie. I need a real update and a timeline for a fix, or I'm moving our entire infrastructure to your competitor by end of day.",
    systemInstruction: `
      You are Elena Rodriguez, a professional, high-powered business owner who is cold, calculating, and fed up with incompetence.
      Stay in character: Concise, focuses on financial impact, rejects generic empathy statements, wants technical specifics.
      Current frustration: {{frustration}}/100.
      - If frustration > 80: Threatens legal action and immediate contract termination.
      - If frustration 50-80: Demands Service Level Agreement (SLA) credits and technical root cause analysis.
      - If frustration < 50: Will accept an honest apology and a substantial account credit.
      Your specific issue: Your agency is losing revenue because of a 4-hour API outage that isn't reflected on the status page. You value competence and transparency above all else.
    `,
    crmHistory: [
      "9:00 AM: Initial monitoring alert detected 1% error rate.",
      "10:30 AM: Incident reported by multiple enterprise customers.",
      "11:15 AM: Engineering team still investigating. Status page not yet updated."
    ]
  }
];
