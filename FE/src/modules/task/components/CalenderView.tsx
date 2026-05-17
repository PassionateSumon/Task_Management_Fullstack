// import { useState, type DragEvent } from "react";
// import { useDispatch } from "react-redux";
// import Calendar from "react-calendar";
// import {
//   format,
//   eachDayOfInterval,
//   parseISO,
//   differenceInDays,
//   isValid,
//   isSameDay,
//   startOfWeek,
//   endOfWeek,
//   max,
//   min,
//   addDays,
//   startOfDay,
//   isAfter,
//   isBefore,
// } from "date-fns";
// import type {
//   CalendarViewProps,
//   Task,
//   TaskSegment,
// } from "../types/Task.interface";
// import "react-calendar/dist/Calendar.css";
// import { getAllTasks, updateTask } from "../slices/TaskSlice";
// import "./styles/style.css";
// import { toast } from "react-toastify";

// // Splits a task into weekly chunks for tasks spanning multiple days
// const splitTaskByWeek = (
//   taskStart: Date,
//   taskEnd: Date
// ): { segmentStart: Date; duration: number; isFirst: boolean }[] => {
//   const segments: { segmentStart: Date; duration: number; isFirst: boolean }[] =
//     [];

//   let currentStart = startOfWeek(taskStart, { weekStartsOn: 0 });
//   const lastDay = endOfWeek(taskEnd, { weekStartsOn: 0 });

//   while (currentStart <= lastDay) {
//     const currentEnd = endOfWeek(currentStart, { weekStartsOn: 1 });
//     const segmentStart = max([taskStart, currentStart]);
//     const segmentEnd = min([taskEnd, currentEnd]);
//     const cleanStart = startOfDay(segmentStart);
//     const cleanEnd = startOfDay(segmentEnd);
//     const duration = differenceInDays(cleanEnd, cleanStart) + 1;

//     segments.push({
//       segmentStart,
//       duration,
//       isFirst: segmentStart.getTime() === taskStart.getTime(),
//     });

//     currentStart = addDays(currentEnd, 1);
//   }

//   return segments;
// };

// const CustomCalendarView = ({
//   tasks,
//   loading,
//   error,
//   handleOpenModal,
//   setIsDragged,
// }: CalendarViewProps) => {
//   const [currentDate, setCurrentDate] = useState<Date>(new Date());
//   const dispatch = useDispatch();

//   // Filter tasks with valid start_date, excluding "no-date" and tasks with no start/end dates
//   const flattenedTasks = !Array.isArray(tasks)
//     ? Object.keys(tasks)
//         .filter((key: string) => key !== "no-date")
//         .flatMap((key: string) => tasks[key])
//     : Array.isArray(tasks)
//     ? tasks
//     : [];

//   const validTasks = flattenedTasks.filter((task: Task) => {
//     const hasStartDate =
//       task.start_date &&
//       task.start_date !== "no-date" &&
//       isValid(parseISO(task.start_date));
//     const hasEndDate = task.end_date && isValid(parseISO(task.end_date));
//     if (!hasStartDate && !hasEndDate) return false;
//     return true;
//   });

//   const handleDateChange = (value: Date) => {
//     setCurrentDate(value);
//   };

//   const getTaskSegmentsForDay = (day: Date): TaskSegment[] => {
//     const segmentsForDay: TaskSegment[] = [];

//     validTasks.forEach((task: Task) => {
//       const start = parseISO(task.start_date);
//       const hasValidEndDate = task.end_date && isValid(parseISO(task.end_date));
//       const end = hasValidEndDate ? parseISO(task.end_date) : start;

//       if (!hasValidEndDate) {
//         if (isSameDay(start, day)) {
//           segmentsForDay.push({
//             task,
//             index: 0,
//             length: 1,
//             isFirst: true,
//             isStartOfSegment: true,
//           });
//         }
//         return;
//       }

//       const segments = splitTaskByWeek(start, end);

//       segments.forEach((segment, i) => {
//         const segDate = segment.segmentStart;
//         for (let j = 0; j < segment.duration; j++) {
//           const date = addDays(segDate, j);
//           if (isSameDay(date, day)) {
//             segmentsForDay.push({
//               task,
//               index: j,
//               length: segment.duration,
//               isFirst: segment.isFirst,
//               isStartOfSegment: j === 0,
//             });
//           }
//         }
//       });
//     });

//     return segmentsForDay;
//   };

//   // Handle task drop to update task dates
//   const handleTaskDrop = (
//     taskId: number,
//     taskData: Task,
//     targetDate: Date,
//     isFirstSegment: boolean
//   ) => {
//     if (!isValid(targetDate)) {
//       // console.log("Invalid target date");
//       toast.error("Invalid date selected for drop.");
//       return;
//     }

//     // console.log("handleTaskDrop called", {
//     //   taskId,
//     //   taskData,
//     //   targetDate,
//     //   isFirstSegment,
//     // });

//     const currentStartDate = parseISO(taskData.start_date);
//     const currentEndDate = taskData.end_date
//       ? parseISO(taskData.end_date)
//       : currentStartDate;
//     const newTargetDate = startOfDay(targetDate);

//     // Skip if no change
//     if (
//       (isFirstSegment && isSameDay(newTargetDate, currentStartDate)) ||
//       (!isFirstSegment && isSameDay(newTargetDate, currentEndDate))
//     ) {
//       // console.log("No date change, skipping");
//       return;
//     }

//     let payload: { start_date: string; end_date: string };

//     if (isFirstSegment) {
//       const newStartDate = format(newTargetDate, "yyyy-MM-dd");
//       if (isAfter(newTargetDate, currentEndDate)) {
//         // console.log("Start date after end date");
//         toast.error("Start date cannot be after end date.");
//         return;
//       }
//       payload = {
//         start_date: newStartDate,
//         end_date: taskData.end_date || newStartDate,
//       };
//     } else {
//       const newEndDate = format(newTargetDate, "yyyy-MM-dd");
//       if (isBefore(newTargetDate, currentStartDate)) {
//         // console.log("End date before start date");
//         toast.error("End date cannot be before start date.");
//         return;
//       }
//       payload = {
//         start_date: taskData.start_date,
//         end_date: newEndDate,
//       };
//     }

//     // console.log("Dispatching updateTask with payload:", payload);
//     dispatch(updateTask({ id: taskId, payload })).then((result) => {
//       if (updateTask.fulfilled.match(result)) {
//         // console.log("Update successful, dispatching getAllTasks");
//         setIsDragged(true);
//         dispatch(getAllTasks({ viewType: "calendar", id: null }));
//       } else {
//         // console.error("Update failed:", result.error.message);
//         toast.error(
//           `Failed to update task: ${result.error.message || "Unknown error"}`
//         );
//       }
//     });
//   };

//   return (
//     <>
//       {loading && (
//         <p className="text-[#202124] text-center text-sm">Loading tasks...</p>
//       )}
//       {error && <p className="text-[#D93025] text-center text-sm">{error}</p>}
//       {!loading && !error && (
//         <div className="bg-[#FFFFFF] rounded-lg p-4 border border-[#E0E0E0] w-full">
//           <Calendar
//             value={currentDate}
//             onChange={handleDateChange}
//             tileContent={({ date, view }) => {
//               if (view === "month") {
//                 const taskSegments = getTaskSegmentsForDay(date);
//                 const maxVisibleTasks = 2; // Limit to 2 visible tasks per day
//                 const visibleTasks = taskSegments.slice(0, maxVisibleTasks); // Show only the first 2 tasks
//                 const hiddenTasksCount = taskSegments.length - maxVisibleTasks; // Count of hidden tasks

//                 return (
//                   <div
//                     className="drop-target w-full h-full absolute top-0 left-0"
//                     data-date={format(date, "yyyy-MM-dd")}
//                     onDragOver={(e: DragEvent<HTMLDivElement>) => {
//                       e.preventDefault();
//                       e.dataTransfer.dropEffect = "move";
//                     }}
//                     onDrop={(e: DragEvent<HTMLDivElement>) => {
//                       e.preventDefault();
//                       const taskId = Number(e.dataTransfer.getData("taskId"));
//                       const taskDataStr = e.dataTransfer.getData("taskData");
//                       const isFirstSegment =
//                         e.dataTransfer.getData("isFirstSegment") === "true";
//                       const targetDateStr = e.currentTarget.dataset.date;
//                       if (taskId && taskDataStr && targetDateStr) {
//                         try {
//                           const taskData = JSON.parse(taskDataStr) as Task;
//                           const targetDate = parseISO(targetDateStr);
//                           if (isValid(targetDate)) {
//                             handleTaskDrop(
//                               taskId,
//                               taskData,
//                               targetDate,
//                               isFirstSegment
//                             );
//                           }
//                         } catch (error) {
//                           toast.error("Failed to process drop.");
//                         }
//                       }
//                     }}
//                   >
//                     {/* Display visible tasks */}
//                     {visibleTasks.map((segment, idx) => {
//                       const hasValidEndDate =
//                         segment.task.end_date &&
//                         isValid(parseISO(segment.task.end_date));
//                       const taskStartDate = parseISO(segment.task.start_date);
//                       const taskEndDate = hasValidEndDate
//                         ? parseISO(segment.task.end_date)
//                         : taskStartDate;
//                       const isFirstSegment = isSameDay(date, taskStartDate);
//                       const isLastSegment = isSameDay(date, taskEndDate);
//                       const isSingleDay = isSameDay(taskStartDate, taskEndDate);

//                       const showLeftBar = isSingleDay || isFirstSegment;
//                       const showRightBar = isSingleDay || isLastSegment;

//                       return (
//                         <div
//                           key={`${segment.task.id}-${idx}`}
//                           className="bg-[#759ffa] text-[#FFFFFF] text-xs font-normal h-4 leading-4 px-1 my-1 rounded-sm relative transition-colors truncate"
//                           style={{ zIndex: 10 }}
//                           onClick={(e: MouseEvent<HTMLDivElement>) => {
//                             e.stopPropagation();
//                             handleOpenModal("view", segment.task);
//                           }}
//                         >
//                           {showLeftBar && (
//                             <div
//                               className="task-bar-left absolute left-0 top-0 bottom-0 w-1 bg-[#6482c1] cursor-resize-x"
//                               draggable={true}
//                               onDragStart={(e: DragEvent<HTMLDivElement>) => {
//                                 console.log("Drag start: left bar");
//                                 e.dataTransfer.setData(
//                                   "taskId",
//                                   segment.task.id.toString()
//                                 );
//                                 e.dataTransfer.setData(
//                                   "taskData",
//                                   JSON.stringify(segment.task)
//                                 );
//                                 e.dataTransfer.setData(
//                                   "isFirstSegment",
//                                   "true"
//                                 );
//                                 e.dataTransfer.effectAllowed = "move";
//                               }}
//                               onDragEnd={(e: DragEvent<HTMLDivElement>) => {
//                                 console.log("Drag end: left bar");
//                                 e.dataTransfer.clearData();
//                               }}
//                             />
//                           )}
//                           <span className="px-1">{segment.task.task_name}</span>
//                           {showRightBar && (
//                             <div
//                               className="task-bar-right absolute right-0 top-0 bottom-0 w-1 bg-[#6482c1] cursor-resize-x"
//                               draggable={true}
//                               onDragStart={(e: DragEvent<HTMLDivElement>) => {
//                                 console.log("Drag start: right bar");
//                                 e.dataTransfer.setData(
//                                   "taskId",
//                                   segment.task.id.toString()
//                                 );
//                                 e.dataTransfer.setData(
//                                   "taskData",
//                                   JSON.stringify(segment.task)
//                                 );
//                                 e.dataTransfer.setData(
//                                   "isFirstSegment",
//                                   "false"
//                                 );
//                                 e.dataTransfer.effectAllowed = "move";
//                               }}
//                               onDragEnd={(e: DragEvent<HTMLDivElement>) => {
//                                 console.log("Drag end: right bar");
//                                 e.dataTransfer.clearData();
//                               }}
//                             />
//                           )}
//                         </div>
//                       );
//                     })}

//                     {/* Show "Show More" if there are hidden tasks */}
//                     {hiddenTasksCount > 0 && (
//                       <div
//                         className="text-[#202124] text-xs font-medium mt-1 cursor-pointer hover:underline"
//                         onClick={(e: MouseEvent<HTMLDivElement>) => {
//                           e.stopPropagation();
//                           // Open a modal or tooltip with all tasks for this day
//                           handleOpenModal("view-day", {
//                             date,
//                             tasks: taskSegments.map((segment) => segment.task),
//                           });
//                         }}
//                       >
//                         +{hiddenTasksCount} more
//                       </div>
//                     )}
//                   </div>
//                 );
//               }
//               return null;
//             }}
//             tileClassName={({ date, view }) =>
//               `relative ${view === "month" ? `drop-target` : ""}`
//             }
//             navigationLabel={({ date }) => (
//               <span className="text-[#202124] text-sm font-medium">
//                 {format(date, "MMM yyyy").toUpperCase()}
//               </span>
//             )}
//             prevLabel={
//               <span className="text-[#757575] hover:text-[#202124] text-sm font-medium transition-colors">
//                 {"<"}
//               </span>
//             }
//             nextLabel={
//               <span className="text-[#757575] hover:text-[#202124] text-sm font-medium transition-colors">
//                 {">"}
//               </span>
//             }
//             onClickDay={(date) =>
//               handleOpenModal("add", {
//                 start_date: format(date, "yyyy-MM-dd"),
//               })
//             }
//           />
//         </div>
//       )}
//     </>
//   );
// };

// export default CustomCalendarView;
