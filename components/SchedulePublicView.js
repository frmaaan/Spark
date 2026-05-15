"use client";

import SchedulePublicAdminView from "@/components/SchedulePublicAdminView";
import SchedulePublicEmployeeView from "@/components/SchedulePublicEmployeeView";

export default function SchedulePublicView({ schedule, userRole }) {
  if (userRole === "ADMIN") {
    return <SchedulePublicAdminView schedule={schedule} />;
  }

  return <SchedulePublicEmployeeView schedule={schedule} />;
}
