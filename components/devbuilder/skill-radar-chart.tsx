"use client";

import { useEffect, useRef } from 'react';
import { SkillCategory, Skill } from '@/lib/agents/gap-analyzer';

interface SkillRadarChartProps {
  categories: SkillCategory[];
  currentSkills: Skill[];
  targetSkills: Skill[];
  className?: string;
}

export function SkillRadarChart({ 
  categories, 
  currentSkills, 
  targetSkills, 
  className = "" 
}: SkillRadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Debug logging
    console.log('Radar Chart Data:', {
      categories: categories.map(c => ({ id: c.id, name: c.name })),
      currentSkills: currentSkills.map(s => ({ id: s.id, name: s.name, level: s.currentLevel, category: s.category })),
      targetSkills: targetSkills.map(s => ({ id: s.id, name: s.name, level: s.currentLevel, category: s.category }))
    });

    // Set canvas size
    const size = 400;
    canvas.width = size;
    canvas.height = size;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Center point
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = 150;

    // Draw radar chart
    drawRadarChart(ctx, centerX, centerY, radius, categories, currentSkills, targetSkills);
  }, [categories, currentSkills, targetSkills]);

  return (
    <div className={`flex justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        className="border rounded-lg bg-background"
        style={{ width: '400px', height: '400px' }}
      />
    </div>
  );
}

function drawRadarChart(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  categories: SkillCategory[],
  currentSkills: Skill[],
  targetSkills: Skill[]
) {
  const numCategories = categories.length;
  const angleStep = (2 * Math.PI) / numCategories;

  // Draw concentric circles
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 5; i++) {
    const r = (radius * i) / 5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, r, 0, 2 * Math.PI);
    ctx.stroke();
  }

  // Draw axes
  ctx.strokeStyle = '#6b7280';
  ctx.lineWidth = 1;
  for (let i = 0; i < numCategories; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  // Draw category labels
  ctx.fillStyle = '#374151';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  categories.forEach((category, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const labelRadius = radius + 30;
    const x = centerX + labelRadius * Math.cos(angle);
    const y = centerY + labelRadius * Math.sin(angle);
    
    ctx.fillText(category.name, x, y);
  });

  // Draw level labels
  ctx.fillStyle = '#9ca3af';
  ctx.font = '10px sans-serif';
  for (let i = 1; i <= 5; i++) {
    const r = (radius * i) / 5;
    ctx.fillText(i.toString(), centerX + r + 5, centerY - 2);
  }

  // Calculate and draw current skills polygon
  if (currentSkills.length > 0) {
    drawSkillPolygon(ctx, centerX, centerY, radius, categories, currentSkills, '#3b82f6', 0.3);
  }

  // Calculate and draw target skills polygon
  if (targetSkills.length > 0) {
    drawSkillPolygon(ctx, centerX, centerY, radius, categories, targetSkills, '#ef4444', 0.3);
  }

  // Draw legend
  drawLegend(ctx, centerX, centerY, radius);
}

function drawSkillPolygon(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  categories: SkillCategory[],
  skills: Skill[],
  color: string,
  alpha: number
) {
  const numCategories = categories.length;
  const angleStep = (2 * Math.PI) / numCategories;

  // Calculate average skill level for each category
  const categoryAverages = categories.map(category => {
    const categorySkills = skills.filter(skill => skill.category === category.id);
    if (categorySkills.length === 0) return 0;
    
    // Calculate weighted average based on skill importance
    const totalWeight = categorySkills.reduce((sum, skill) => sum + skill.importance, 0);
    if (totalWeight === 0) return 0;
    
    const weightedSum = categorySkills.reduce((sum, skill) => sum + (skill.currentLevel * skill.importance), 0);
    const average = weightedSum / totalWeight;
    const roundedAverage = Math.round(average * 10) / 10; // Round to 1 decimal place
    
    console.log(`Category ${category.name}:`, {
      skills: categorySkills.map(s => ({ name: s.name, level: s.currentLevel, importance: s.importance })),
      totalWeight,
      weightedSum,
      average: roundedAverage
    });
    
    return roundedAverage;
  });

  // Draw filled polygon
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  
  categoryAverages.forEach((level, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = (radius * level) / 5;
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  
  ctx.closePath();
  ctx.fill();

  // Draw polygon outline
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawLegend(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number) {
  const legendY = centerY + radius + 60;
  
  // Current skills legend
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(centerX - 80, legendY - 10, 15, 10);
  ctx.fillStyle = '#374151';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Current Skills', centerX - 60, legendY - 2);

  // Target skills legend
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(centerX + 20, legendY - 10, 15, 10);
  ctx.fillStyle = '#374151';
  ctx.fillText('Target Skills', centerX + 40, legendY - 2);
}
