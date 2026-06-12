import { clamp } from "../shared/math.js";

export function normalizeAxisDomain(min, max, logScale) {
      let d0 = Number(min);
      let d1 = Number(max);
      if (!Number.isFinite(d0) || !Number.isFinite(d1)) {
        d0 = logScale ? 1 : 0;
        d1 = logScale ? 10 : 1;
      }
      if (d0 > d1) [d0, d1] = [d1, d0];
      if (logScale) {
        d0 = Math.max(d0, 1e-12);
        d1 = Math.max(d1, 1e-12);
        if (d0 > d1) [d0, d1] = [d1, d0];
        const s0 = Math.log10(d0);
        const s1 = Math.log10(d1);
        if (!Number.isFinite(s0) || !Number.isFinite(s1) || Math.abs(s1 - s0) < 1e-12) {
          const center = Number.isFinite(s0) ? s0 : 0;
          return [Math.pow(10, center - 0.005), Math.pow(10, center + 0.005)];
        }
        return [d0, d1];
      }
      if (Math.abs(d1 - d0) < 1e-12) {
        const pad = Math.max(Math.abs(d0) * 0.01, 1);
        d0 -= pad;
        d1 += pad;
      }
      return [d0, d1];
    }

export function axisSpaceValue(value, logScale) {
      return logScale ? Math.log10(Math.max(value, 1e-12)) : value;
    }

export function valueFromAxisSpace(space, logScale) {
      return logScale ? Math.pow(10, space) : space;
    }

export function makeScale(domain, range, logScale) {
      const [d0, d1] = normalizeAxisDomain(domain[0], domain[1], logScale);
      if (logScale) {
        const l0 = axisSpaceValue(d0, true);
        const l1 = axisSpaceValue(d1, true);
        return value => {
          const v = axisSpaceValue(value, true);
          return range[0] + (v - l0) / (l1 - l0) * (range[1] - range[0]);
        };
      }
      return value => range[0] + (value - d0) / (d1 - d0) * (range[1] - range[0]);
    }

    // Axis tick planning lives in axis-space: linear axes use raw values,
    // and log axes use log10(value). Keeping all axes on the same path avoids
    // the earlier pile of separate log-X/log-Y/deep-zoom helpers.
export const AXIS_TICK_MULTIPLIERS = [1, 2, 2.5, 5, 10];
export const AXIS_EPSILON = 1e-12;

export function niceAxisStep(rawStep, mode = "ceil") {
      if (!Number.isFinite(rawStep) || rawStep <= 0) return 1;
      const exponent = Math.floor(Math.log10(rawStep));
      const base = Math.pow(10, exponent);
      const normalized = rawStep / base;
      if (mode === "floor") {
        for (let index = AXIS_TICK_MULTIPLIERS.length - 1; index >= 0; index--) {
          if (normalized >= AXIS_TICK_MULTIPLIERS[index]) return AXIS_TICK_MULTIPLIERS[index] * base;
        }
        return AXIS_TICK_MULTIPLIERS[0] * base / 10;
      }
      const picked = AXIS_TICK_MULTIPLIERS.find(value => normalized <= value) || AXIS_TICK_MULTIPLIERS[AXIS_TICK_MULTIPLIERS.length - 1];
      return picked * base;
    }

export function nextAxisStep(step, direction) {
      if (!Number.isFinite(step) || step <= 0) return 1;
      const exponent = Math.floor(Math.log10(step));
      const base = Math.pow(10, exponent);
      const normalized = step / base;
      let index = AXIS_TICK_MULTIPLIERS.findIndex(value => Math.abs(value - normalized) <= Math.max(AXIS_EPSILON, normalized * 1e-10));
      if (index < 0) index = AXIS_TICK_MULTIPLIERS.findIndex(value => normalized < value);
      if (index < 0) index = AXIS_TICK_MULTIPLIERS.length - 1;
      if (direction > 0) {
        if (index < AXIS_TICK_MULTIPLIERS.length - 1) return AXIS_TICK_MULTIPLIERS[index + 1] * base;
        return AXIS_TICK_MULTIPLIERS[1] * base * 10;
      }
      if (index > 0) return AXIS_TICK_MULTIPLIERS[index - 1] * base;
      return AXIS_TICK_MULTIPLIERS[AXIS_TICK_MULTIPLIERS.length - 2] * base / 10;
    }

export function normalizeAxisSpace(min, max, logScale) {
      const [d0, d1] = normalizeAxisDomain(min, max, logScale);
      const s0 = axisSpaceValue(d0, logScale);
      const s1 = axisSpaceValue(d1, logScale);
      const low = Math.min(s0, s1);
      const high = Math.max(s0, s1);
      const span = Math.max(high - low, 1e-15);
      return { d0, d1, low, high, span };
    }

export function axisTickOptions(pixelSpan, options = {}) {
      const gridPixelGap = Math.max(options.gridPixelGap || 58, 12);
      const labelPixelGap = Math.max(options.labelPixelGap || 92, gridPixelGap);
      const maxTicks = clamp(options.maxTicks || 90, 4, 240);
      const minTicks = clamp(options.minTicks || 4, 2, Math.min(12, maxTicks));
      const targetGridCount = clamp(Math.round(pixelSpan / gridPixelGap) + 1, minTicks, maxTicks);
      const labelBudget = clamp(Math.floor(pixelSpan / labelPixelGap) + 1, 2, Math.max(2, maxTicks));
      return { gridPixelGap, labelPixelGap, maxTicks, minTicks, targetGridCount, labelBudget };
    }

export function axisTickIndexRange(spaceMin, spaceMax, step) {
      const low = Math.min(spaceMin, spaceMax);
      const high = Math.max(spaceMin, spaceMax);
      const span = Math.max(high - low, 0);
      const epsilon = Math.max(Math.abs(step) * 1e-10, span * 1e-12, 1e-14);
      const startIndex = Math.ceil((low - epsilon) / step);
      const endIndex = Math.floor((high + epsilon) / step);
      return { startIndex, endIndex, epsilon, low, high };
    }

export function estimatedAxisTickCount(spaceMin, spaceMax, step) {
      if (!Number.isFinite(spaceMin) || !Number.isFinite(spaceMax) || !Number.isFinite(step) || step <= 0) return 0;
      const { startIndex, endIndex } = axisTickIndexRange(spaceMin, spaceMax, step);
      return Math.max(0, endIndex - startIndex + 1);
    }

export function chooseAxisTickStep(spaceMin, spaceMax, targetCount, minTicks, maxTicks) {
      const span = Math.max(Math.abs(spaceMax - spaceMin), 1e-15);
      const minUsefulStep = span / Math.max(maxTicks - 1, 1);
      let step = niceAxisStep(span / Math.max(targetCount - 1, 1), "ceil");
      for (let attempt = 0; attempt < 40; attempt++) {
        const estimated = estimatedAxisTickCount(spaceMin, spaceMax, step);
        if (estimated > maxTicks) {
          step = nextAxisStep(step, 1);
          continue;
        }
        if (estimated < minTicks && step > minUsefulStep * (1 + 1e-9)) {
          step = nextAxisStep(step, -1);
          continue;
        }
        return step;
      }
      return step;
    }

export function generateAxisSpaceTicks(spaceMin, spaceMax, step, logScale) {
      if (!Number.isFinite(spaceMin) || !Number.isFinite(spaceMax) || !Number.isFinite(step) || step <= 0) return [];
      const { startIndex, endIndex, epsilon, low, high } = axisTickIndexRange(spaceMin, spaceMax, step);
      const count = Math.max(0, endIndex - startIndex + 1);
      if (!count || count > 5000) return [];
      const ticks = [];
      for (let index = startIndex; index <= endIndex; index++) {
        const space = index * step;
        if (space < low - epsilon || space > high + epsilon) continue;
        const value = valueFromAxisSpace(space, logScale);
        if (Number.isFinite(value)) ticks.push(value);
      }
      return ticks;
    }

export function interpolatedAxisTicks(min, max, logScale, count) {
      const { low, high } = normalizeAxisSpace(min, max, logScale);
      const safeCount = clamp(Math.floor(count), 2, 160);
      return Array.from({ length: safeCount }, (_, index) => {
        const ratio = safeCount <= 1 ? 0 : index / (safeCount - 1);
        return valueFromAxisSpace(low + (high - low) * ratio, logScale);
      });
    }

export function uniqueSortedAxisTicks(values, logScale) {
      const sorted = values
        .filter(value => Number.isFinite(value) && (!logScale || value > 0))
        .sort((a, b) => axisSpaceValue(a, logScale) - axisSpaceValue(b, logScale));
      const result = [];
      for (const value of sorted) {
        const space = axisSpaceValue(value, logScale);
        const previous = result.length ? axisSpaceValue(result[result.length - 1], logScale) : NaN;
        if (!result.length || Math.abs(space - previous) > 1e-12) result.push(value);
      }
      return result;
    }

export function downsampleTicksWithCoverage(ticks, maxTicks) {
      if (!Array.isArray(ticks) || ticks.length <= maxTicks) return ticks;
      if (maxTicks <= 2) return [ticks[0], ticks[ticks.length - 1]];
      const result = [ticks[0]];
      const interiorSlots = maxTicks - 2;
      for (let slot = 1; slot <= interiorSlots; slot++) {
        const sourceIndex = Math.round(slot * (ticks.length - 1) / (interiorSlots + 1));
        const value = ticks[sourceIndex];
        if (value !== result[result.length - 1]) result.push(value);
      }
      if (ticks[ticks.length - 1] !== result[result.length - 1]) result.push(ticks[ticks.length - 1]);
      return result;
    }

export function labelAxisTicks(ticks, axisSpace, pixelSpan, labelPixelGap, labelBudget) {
      const labelStride = Math.max(1, Math.ceil(ticks.length / labelBudget));
      let lastLabelPixel = -Infinity;
      return ticks.map((value, index) => {
        const space = axisSpaceValue(value, axisSpace.logScale);
        const pixel = (space - axisSpace.low) / axisSpace.span * pixelSpan;
        const edge = index === 0 || index === ticks.length - 1;
        const gapOk = pixel - lastLabelPixel >= labelPixelGap * 0.86;
        const label = edge || (index % labelStride === 0 && gapOk);
        if (label) lastLabelPixel = pixel;
        return {
          tick: value,
          value,
          label,
          major: label,
          space,
          pixel,
        };
      });
    }

export function buildAxisTickPlan(min, max, pixelSpan, logScale, options = {}) {
      const axisSpace = { ...normalizeAxisSpace(min, max, logScale), logScale };
      const tickOptions = axisTickOptions(pixelSpan, options);
      const step = chooseAxisTickStep(axisSpace.low, axisSpace.high, tickOptions.targetGridCount, tickOptions.minTicks, tickOptions.maxTicks);
      let ticks = generateAxisSpaceTicks(axisSpace.low, axisSpace.high, step, logScale);
      if (ticks.length < 2) {
        ticks = interpolatedAxisTicks(axisSpace.d0, axisSpace.d1, logScale, tickOptions.targetGridCount);
      }
      ticks = uniqueSortedAxisTicks([axisSpace.d0, ...ticks, axisSpace.d1], logScale);
      ticks = downsampleTicksWithCoverage(ticks, tickOptions.maxTicks);
      return labelAxisTicks(ticks, axisSpace, pixelSpan, tickOptions.labelPixelGap, tickOptions.labelBudget);
    }

export function linearTicks(min, max, count = 6) {
      return buildAxisTickPlan(min, max, Math.max(count - 1, 1) * 60, false, {
        gridPixelGap: 60,
        labelPixelGap: 60,
        maxTicks: Math.max(count + 2, 8),
        minTicks: Math.min(count, 4),
      }).map(item => item.value);
    }


