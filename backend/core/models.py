import uuid
from django.db import models


class Session(models.Model):
    STATUS_CHOICES = [
        ("extracting", "Extracting"),
        ("assessing",  "Assessing"),
        ("scoring",    "Scoring"),
        ("complete",   "Complete"),
        ("error",      "Error"),
    ]

    DEPTH_CHOICES = [
        ("snapshot", "Snapshot"),    # 1 question / skill
        ("standard", "Standard"),    # 3 questions / skill
        ("deep",     "Deep Dive"),   # 5 questions / skill
    ]

    DEPTH_QUESTIONS = {
        "snapshot": 1,
        "standard": 3,
        "deep":     5,
    }

    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    depth            = models.CharField(max_length=10, choices=DEPTH_CHOICES, default="standard")
    jd_text          = models.TextField()
    resume_text      = models.TextField()

    # Populated after skill extraction
    jd_skills        = models.JSONField(default=list)    # [{skill, importance, context}]
    resume_skills    = models.JSONField(default=list)    # [{skill, confidence, evidence}]
    gap_list         = models.JSONField(default=list)    # ordered list of skill names to assess

    # Assessment state (mutated each turn)
    current_skill_index   = models.IntegerField(default=0)
    current_difficulty    = models.CharField(max_length=10, default="easy")
    questions_this_skill  = models.IntegerField(default=0)
    pending_question      = models.TextField(blank=True, default="")
    skill_histories       = models.JSONField(default=dict)  # {skill: [{q,a,score,feedback,key_gap}]}

    # Final outputs
    scores        = models.JSONField(default=dict)   # {skill: 0-100}
    learning_plan = models.JSONField(null=True, blank=True)

    status     = models.CharField(max_length=20, choices=STATUS_CHOICES, default="extracting")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Session {self.id} [{self.status}]"

    @property
    def questions_per_skill(self):
        return self.DEPTH_QUESTIONS.get(self.depth, 3)

    def current_skill(self):
        if self.current_skill_index < len(self.gap_list):
            return self.gap_list[self.current_skill_index]
        return None

    def all_skills_done(self):
        return self.current_skill_index >= len(self.gap_list)

    def progress(self):
        total = len(self.gap_list)
        if total == 0:
            return {"current": 0, "total": 0, "pct": 0}
        return {
            "current": min(self.current_skill_index + 1, total),
            "total":   total,
            "pct":     round((self.current_skill_index / total) * 100),
            "skill":   self.current_skill(),
            "difficulty": self.current_difficulty,
        }
