<script setup lang="ts">
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 200 200"
    role="img"
    aria-label="AI-SALE"
  >
    <circle
      cx="100"
      cy="100"
      r="100"
      fill="#0E2440"
    />

    <!-- top-left: circuit breaker -->
    <g
      fill="none"
      stroke="#8AA8C8"
      stroke-width="2.4"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <rect
        x="32"
        y="36"
        width="22"
        height="30"
        rx="2"
      />
      <line
        x1="43"
        y1="36"
        x2="43"
        y2="30"
      />
      <line
        x1="43"
        y1="66"
        x2="43"
        y2="72"
      />
      <line
        x1="38"
        y1="50"
        x2="48"
        y2="44"
      />
    </g>

    <!-- top-right: lightning bolt -->
    <path
      d="M150 30 L138 56 L148 56 L142 76 L160 50 L150 50 Z"
      fill="#8AA8C8"
    />

    <!-- bottom-left: resistor/component -->
    <g
      fill="none"
      stroke="#8AA8C8"
      stroke-width="2.4"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <line
        x1="28"
        y1="150"
        x2="36"
        y2="150"
      />
      <polyline points="36,150 40,142 48,158 56,142 60,150" />
      <line
        x1="60"
        y1="150"
        x2="68"
        y2="150"
      />
    </g>

    <!-- bottom-right: cable / zigzag wires -->
    <g
      fill="none"
      stroke="#8AA8C8"
      stroke-width="2.4"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M134 142 C 142 142, 142 158, 150 158 S 158 142, 166 142" />
      <path d="M134 152 C 142 152, 142 168, 150 168 S 158 152, 166 152" />
    </g>

    <!-- AI-SALE label -->
    <text
      x="100"
      y="113"
      text-anchor="middle"
      font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
      font-weight="800"
      font-size="34"
      letter-spacing="1"
      fill="#FFFFFF"
    >AI-SALE</text>
  </svg>
</template>
