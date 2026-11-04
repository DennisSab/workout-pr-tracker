export function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized." }, { status: 401 });
}

export function workoutNotFoundResponse(message = "Workout not found.") {
  return Response.json({ error: message }, { status: 404 });
}
