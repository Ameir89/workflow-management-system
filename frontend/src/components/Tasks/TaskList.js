import React, { useState, useEffect } from "react";

const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setTasks([
        {
          id: 1,
          title: "Complete project setup",
          status: "pending",
          priority: "high",
        },
        {
          id: 2,
          title: "Review requirements",
          status: "in-progress",
          priority: "medium",
        },
        {
          id: 3,
          title: "Update documentation",
          status: "completed",
          priority: "low",
        },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return <div>Loading tasks...</div>;
  }

  return (
    <div className="task-list">
      <h2>Tasks</h2>
      <div className="task-grid">
        {tasks.map((task) => (
          <div key={task.id} className={`task-card ${task.status}`}>
            <h3>{task.title}</h3>
            <p>Status: {task.status}</p>
            <p>Priority: {task.priority}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskList;
