/**
 * Educational Templates Library Generator
 */

import { state } from '../app/state.js';
import { history, AddObjectCommand } from '../app/commands.js';
import { createShapeObject, createTextObject, createStickyObject, ShapeTypes } from '../documents/schema.js';
import { showToast } from '../app/notifications.js';

export function applyTemplate(templateKey) {
  const page = state.getActivePage();
  if (!page) return;

  switch (templateKey) {
    case 'blank':
      state.currentDocument.settings.gridStyle = 'blank';
      break;
    case 'coordinate':
      state.currentDocument.settings.gridStyle = 'graph';
      break;
    case 'ruled':
      state.currentDocument.settings.gridStyle = 'ruled';
      break;
    case 'lesson-plan':
      createLessonPlanTemplate(page);
      break;
    case 'mind-map':
      createMindMapTemplate(page);
      break;
    case 'flowchart':
      createFlowchartTemplate(page);
      break;
    case 'brainstorming':
      createBrainstormingTemplate(page);
      break;
  }

  state.markDirty();
  showToast(`Applied ${templateKey} template`, 'success');
}

function createLessonPlanTemplate(page) {
  const title = createTextObject('Lesson Plan: [Topic Title]', 50, 50, { fontSize: 28, fontWeight: 'bold' });
  const box1 = createShapeObject(ShapeTypes.RECTANGLE, 50, 110, 320, 200, { strokeColor: '#4F46E5', fillColor: '#EEF2FF' });
  const t1 = createTextObject('1. Learning Objectives\n\n• Objective A\n• Objective B', 70, 130, { fontSize: 16 });

  const box2 = createShapeObject(ShapeTypes.RECTANGLE, 400, 110, 320, 200, { strokeColor: '#10B981', fillColor: '#ECFDF5' });
  const t2 = createTextObject('2. Key Vocabulary & Concepts\n\n• Term 1\n• Term 2', 420, 130, { fontSize: 16 });

  page.objects.push(title, box1, t1, box2, t2);
}

function createMindMapTemplate(page) {
  const center = createShapeObject(ShapeTypes.ELLIPSE, 300, 200, 160, 100, { strokeColor: '#4F46E5', fillColor: '#EEF2FF' });
  const centerText = createTextObject('Central Topic', 330, 235, { fontSize: 18, fontWeight: 'bold' });

  const node1 = createStickyObject('Subtopic 1', 100, 80, { fillColor: '#BAE6FD' });
  const node2 = createStickyObject('Subtopic 2', 500, 80, { fillColor: '#BBF7D0' });
  const node3 = createStickyObject('Subtopic 3', 300, 360, { fillColor: '#FBCFE8' });

  page.objects.push(center, centerText, node1, node2, node3);
}

function createFlowchartTemplate(page) {
  const start = createShapeObject(ShapeTypes.ELLIPSE, 50, 100, 140, 60, { strokeColor: '#10B981', fillColor: '#ECFDF5' });
  const stText = createTextObject('Start', 100, 118, { fontSize: 16 });

  const arrow1 = createShapeObject(ShapeTypes.ARROW, 190, 130, 80, 0, { strokeColor: '#172033', strokeWidth: 2 });

  const process = createShapeObject(ShapeTypes.RECTANGLE, 270, 90, 160, 80, { strokeColor: '#3B82F6', fillColor: '#EFF6FF' });
  const prText = createTextObject('Process Step', 300, 120, { fontSize: 16 });

  page.objects.push(start, stText, arrow1, process, prText);
}

function createBrainstormingTemplate(page) {
  const header = createTextObject('Brainstorming Session', 50, 40, { fontSize: 24, fontWeight: 'bold' });
  const col1 = createTextObject('Ideas', 50, 90, { fontSize: 18, fontWeight: 'bold', textColor: '#4F46E5' });
  const note1 = createStickyObject('Idea 1', 50, 130, { fillColor: '#FEF08A' });

  const col2 = createTextObject('To Action', 300, 90, { fontSize: 18, fontWeight: 'bold', textColor: '#10B981' });
  const note2 = createStickyObject('Action Item', 300, 130, { fillColor: '#BBF7D0' });

  page.objects.push(header, col1, note1, col2, note2);
}
