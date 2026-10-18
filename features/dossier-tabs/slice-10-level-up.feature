Feature: Level up

  Scenario: Costs follow the V20 formulas
    Given a Toreador with Stealth 2, Melee 0, Strength 2, Presence 3, Conscience 3, Humanity 7 and Willpower 6, and 20 XP available
    When the Level up tab is opened
    Then Stealth 2 → 3 costs 4 XP and Melee 0 → 1 costs 3 XP
    And Strength 2 → 3 costs 8 XP
    And Presence 3 → 4 costs 15 XP as an in-clan Discipline
    And Conscience 3 → 4 costs 6 XP and Humanity 7 → 8 costs 14 XP
    And Willpower 6 → 7 costs 6 XP

  Scenario Outline: Disciplines cost by clan
    Given a character whose clan text is "<clan>" with Auspex 2 and 20 XP available
    When the Level up tab is opened
    Then Auspex 2 → 3 costs <cost> XP

    Examples:
      | clan      | cost |
      | Toreador  | 10   |
      | toreador  | 10   |
      | Brujah    | 14   |
      | Caitiff   | 12   |
      | Self-made | 12   |
      |           | 12   |

  Scenario: An exact budget is affordable and one XP short is not
    Given a Toreador with Strength 2 and 8 XP available
    Then Strength 2 → 3 is offered at 8 XP
    Given a Toreador with Strength 2 and 7 XP available
    Then Strength 2 → 3 shows "Unavailable · need 1 XP" and its "+" is disabled with that reason in text

  Scenario: A trait at its maximum cannot be raised
    Given a character with Courage 5
    When the Level up tab is opened
    Then Courage shows "Maximum" and its "+" is disabled

  Scenario: Only Disciplines the character holds are offered
    Given a Toreador with Presence 3 and Auspex 0
    When the Level up tab is opened
    Then Presence is offered and Auspex is not
    And Backgrounds are not offered
    And the guidance about new Disciplines and Storyteller confirmation is shown as text with no button

  Scenario: Selecting an advancement changes only the review
    Given a Toreador with Stealth 2 and 8 XP available in "Session 12"
    When the player selects Stealth 2 → 3 on the Level up tab
    Then the Upgrade review lists Stealth with 4 XP
    And "After confirmation" reads 4 XP
    And "Stealth 2 to 3 added to the review. 4 XP pending." is announced
    And the character's Stealth is still 2 and the ledger is unchanged

  Scenario: Later choices are judged against the remaining balance
    Given a Toreador with Stealth 2 and Strength 2 and 8 XP available in "Session 12"
    When the player selects Stealth 2 → 3 on the Level up tab
    Then Strength 2 → 3 shows "Unavailable · need 4 XP"
    And Stealth offers no further "+" while pending

  Scenario: Removing a pending choice frees its cost
    Given Stealth and Melee pending with 10 XP available
    When the player removes Melee from the review
    Then "After confirmation" rises by 3 XP
    And "Melee removed from the review. 4 XP pending." is announced
    And focus is on the next line or the review heading

  Scenario: Confirming applies everything at once
    Given "Session 12" is current with 10 XP available and Stealth 2 → 3 and Melee 0 → 1 pending
    When the player confirms on the Level up tab
    Then Stealth is 3 and Melee is 1
    And Session 12 holds two spending records "Stealth 2 → 3 · 4 XP" and "Melee 0 → 1 · 3 XP"
    And Total spent rises by 7 and Available reads 3
    And "Applied 2 advancements. 7 XP spent. Available 3." is announced
    And the result is shown as "Applied 2 advancements · 7 XP spent" with "Undo"
    And all of it is still there after a reload and was saved in a single write

  Scenario: Confirming works in play mode
    Given a character in play mode with "Session 12" current, 10 XP available and Stealth 2 → 3 pending
    When the player confirms on the Level up tab
    Then Stealth is 3 and the sheet is still in play mode

  Scenario: Undo restores the ratings and removes exactly those records
    Given advancements just applied on the Level up tab
    When the player presses Undo
    Then the ratings are as before and the spending records are gone
    And the Available balance is as before

  Scenario Outline: Clear, Cancel and Back change nothing
    Given two advancements pending with "Session 12" current
    When the player chooses <action> on the Level up tab
    Then the character's ratings and the ledger are unchanged
    And <result>

    Examples:
      | action                    | result                           |
      | "Clear selections"        | the pending list is empty        |
      | "Cancel"                  | the pending list is empty        |
      | "Back to character sheet" | the Character sheet tab is shown |

  Scenario: Pending choices survive a tab switch but not a reload
    Given a pending advancement on the Level up tab
    When the player opens the Combat tab and returns
    Then the advancement is still pending
    When the sheet is reloaded
    Then nothing is pending
    And the tab says "Pending selections are not saved."

  Scenario: A stale choice is dropped with a message
    Given Stealth 2 → 3 pending and then Stealth raised to 3 in edit mode
    When the Level up tab is opened again
    Then "Stealth changed from 2 to 3 · removed from the review" is shown
    And Stealth 3 → 4 is offered

  Scenario: With no session the tab asks for one
    Given a character with no session
    When the Level up tab is opened
    Then the start-a-session prompt is shown
    And "No XP available" links to Journal → Experience
    And "Confirm & apply" is disabled and says to select an advancement

  Scenario: Confirm is disabled with nothing pending
    Given "Session 12" is current with 10 XP available
    When the Level up tab is opened
    Then "Confirm & apply" is disabled and says to select an advancement

  Scenario: Search and the affordable filter narrow the choices
    Given a Toreador with 8 XP available
    When the player searches "stealth" on the Level up tab
    Then only matching traits remain
    When the player turns on "Show only affordable"
    Then rows marked "Unavailable" are hidden
    When the player searches "zzzz" on the Level up tab
    Then an empty-state message is shown

  Scenario: The pending bar is always in view
    Given a pending advancement on the Level up tab at 320 pixels wide
    Then a "1 pending upgrade · −4 XP" bar links to the review

  Scenario: The Level up tab is accessible and fits a phone
    Given a Toreador with 10 XP available and one advancement pending
    When the Level up tab is scanned for accessibility problems
    Then no problems are reported
    When the Level up tab is opened at 320 pixels wide with crowded content
    Then the page does not scroll sideways
