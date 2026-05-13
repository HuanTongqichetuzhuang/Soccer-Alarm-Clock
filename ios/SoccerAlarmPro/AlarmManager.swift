import UserNotifications
import EventKit

// ==================== 双通道闹钟管理 ====================
class AlarmManager {
    static let shared = AlarmManager()
    private let eventStore = EKEventStore()
    private var calendarAccessGranted = false
    
    // 通道1: 本地推送通知（主力）
    func schedule(matchId: String, home: String, away: String, at matchTime: Date) {
        // 比赛前15分钟提醒
        scheduleNotification(matchId: matchId, home: home, away: away, at: matchTime.addingTimeInterval(-900), body: "\(home) vs \(away) 即将开始")
        
        // 比赛开始时提醒
        scheduleNotification(matchId: matchId, home: home, away: away, at: matchTime, body: "\(home) vs \(away) 比赛开始！")
        
        // 通道2: 日历提醒（更可靠）
        addCalendarEvent(matchId: matchId, home: home, away: away, at: matchTime)
    }
    
    func cancel(matchId: String) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [
            "pre_\(matchId)", "start_\(matchId)"
        ])
    }
    
    // ==================== 本地通知 ====================
    private func scheduleNotification(matchId: String, home: String, away: String, at date: Date, body: String) {
        let prefix = date.timeIntervalSince(matchId as! Double) < 0 ? "pre" : "start"
        let id = "\(prefix)_\(matchId)"
        
        let content = UNMutableNotificationContent()
        content.title = "⚽ SoccerAlarmPro"
        content.body = body
        content.sound = .defaultCritical // 即使勿扰模式也响
        content.userInfo = ["matchId": matchId, "home": home, "away": away]
        
        // 计算触发时间
        let components = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: date)
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
        
        let request = UNNotificationRequest(identifier: id, content: content, trigger: trigger)
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error { print("通知预约失败: \(error)") }
        }
    }
    
    // ==================== 日历提醒 ====================
    private func addCalendarEvent(matchId: String, home: String, away: String, at matchTime: Date) {
        requestCalendarAccess { [weak self] granted in
            guard granted else { return }
            
            let event = EKEvent(eventStore: self!.eventStore)
            event.title = "⚽ \(home) vs \(away)"
            event.notes = "SoccerAlarmPro 比赛提醒\nmatchId: \(matchId)"
            event.startDate = matchTime
            event.endDate = matchTime.addingTimeInterval(7200) // 2小时
            event.calendar = self!.eventStore.defaultCalendarForNewEvents
            
            // 日历自带提醒：提前 15 分钟
            let alarm = EKAlarm(relativeOffset: -900)
            event.addAlarm(alarm)
            
            // 比赛开始提醒
            let alarm2 = EKAlarm(relativeOffset: 0)
            event.addAlarm(alarm2)
            
            do {
                try self!.eventStore.save(event, span: .thisEvent)
            } catch {
                print("日历事件创建失败: \(error)")
            }
        }
    }
    
    private func requestCalendarAccess(completion: @escaping (Bool) -> Void) {
        if #available(iOS 17.0, *) {
            eventStore.requestFullAccessToEvents { granted, _ in completion(granted) }
        } else {
            eventStore.requestAccess(to: .event) { granted, _ in completion(granted) }
        }
    }
    
    // 请求通知权限
    func requestPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound, .criticalAlert]) { granted, error in
            if let error = error { print("通知权限: \(error)") }
        }
    }
}

// ==================== 通知管理 ====================
class NotificationManager {
    static let shared = NotificationManager()
    
    func requestPermission() {
        AlarmManager.shared.requestPermission()
    }
}