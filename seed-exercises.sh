#!/bin/bash

API_URL="http://localhost:3000/api/exercises"

add_exercise () {
  curl -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$1\",\"muscleGroup\":\"$2\"}"
  echo ""
}

# Chest
add_exercise "Incline Bench Press" "Chest"
add_exercise "Decline Bench Press" "Chest"
add_exercise "Dumbbell Bench Press" "Chest"
add_exercise "Incline Dumbbell Press" "Chest"
add_exercise "Chest Fly" "Chest"
add_exercise "Cable Fly" "Chest"
add_exercise "Push Up" "Chest"
add_exercise "Dips" "Chest"

# Back
add_exercise "Pull Up" "Back"
add_exercise "Deadlift" "Back"
add_exercise "Romanian Deadlift" "Back"
add_exercise "Barbell Row" "Back"
add_exercise "Dumbbell Row" "Back"
add_exercise "Seated Row" "Back"
add_exercise "T Bar Row" "Back"
add_exercise "Face Pull" "Back"

# Shoulders
add_exercise "Overhead Press" "Shoulders"
add_exercise "Dumbbell Shoulder Press" "Shoulders"
add_exercise "Lateral Raise" "Shoulders"
add_exercise "Front Raise" "Shoulders"
add_exercise "Rear Delt Fly" "Shoulders"
add_exercise "Shrugs" "Shoulders"

# Legs
add_exercise "Squat" "Legs"
add_exercise "Front Squat" "Legs"
add_exercise "Leg Press" "Legs"
add_exercise "Leg Extension" "Legs"
add_exercise "Leg Curl" "Legs"
add_exercise "Walking Lunges" "Legs"
add_exercise "Bulgarian Split Squat" "Legs"
add_exercise "Calf Raise" "Legs"
add_exercise "Hip Thrust" "Legs"

# Biceps
add_exercise "Biceps Curl" "Biceps"
add_exercise "Hammer Curl" "Biceps"
add_exercise "Preacher Curl" "Biceps"
add_exercise "Cable Curl" "Biceps"
add_exercise "Concentration Curl" "Biceps"

# Triceps
add_exercise "Triceps Pushdown" "Triceps"
add_exercise "Skull Crushers" "Triceps"
add_exercise "Overhead Triceps Extension" "Triceps"
add_exercise "Close Grip Bench Press" "Triceps"

# Core
add_exercise "Plank" "Core"
add_exercise "Crunches" "Core"
add_exercise "Leg Raises" "Core"
add_exercise "Cable Crunch" "Core"
