Feature: Journal experience

  Scenario: The four cards show the ledger
    Given awards of 3, 4 and 4 and spendings of 6 and 2, with the first 3 in the current session
    When the Journal tab is opened
    Then Total earned reads 11, Total spent 8, Available 3 and This session 3

  Scenario: Awarding experience updates the totals
    Given "Session 12" is current with 8 earned, 3 spent and 2 earned this session
    When the player awards 3 points with the note "The missing portrait" on the Journal experience
    Then Total earned reads 11, Available reads 8 and This session reads 5
    And the award is the first row of the award log
    And "3 XP awarded. Available 8." is announced

  Scenario: A negative award is a correction
    Given "Session 12" is current with 8 earned, 0 spent and 3 earned this session
    When the player awards -2 with the note "Correction" on the Journal experience
    Then Total earned reads 6, Available reads 6 and This session reads 1
    And "2 XP taken back. Available 6." is announced

  Scenario Outline: An invalid award is refused
    Given "Session 12" is current
    When the player submits "<amount>" as the award on the Journal experience
    Then "Enter a whole number of XP, other than 0." is shown beside the field
    And the ledger is unchanged

    Examples:
      | amount |
      |        |
      | 0      |
      | abc    |
      | 2.5    |

  Scenario: Awarding with no session asks for one
    Given a character with no session
    When the Journal tab is opened
    Then the start-a-session prompt is shown in the Experience section

  Scenario: Overspent experience is shown as negative
    Given awards totalling 5 and spendings totalling 7
    When the Journal tab is opened
    Then Available reads "−2" and says "Overspent"

  Scenario: Four awards need no Show all and five do
    Given four awards
    Then all four are shown and there is no "Show all" control
    Given five awards, the newest in the current session
    Then four are shown, the newest first, the current session's marked "current", with "Show all"
    When the player chooses "Show all"
    Then all five are shown and the count is announced

  Scenario: The spending record lists spendings
    Given a spending "Auspex 3" of 10 points in Session 10 and one "Presence 3" of 10 points in Session 8
    When the Journal tab is opened
    Then the spending record reads "2 entries · 20 XP" and lists each with its session and cost

  Scenario: The cost reference is shown
    When the Journal tab is opened
    Then the reference lists New Ability 3 XP, Ability increase current × 2, In-clan Discipline current × 5, Out-of-clan Discipline current × 7, Attribute current × 4, Humanity / Path current × 2, Virtue current × 2 and Willpower (perm.) current

  Scenario: Award XP works in play mode
    Given a character in play mode with a session
    When the player awards 2 points on the Journal experience
    Then it is recorded and the character's traits are unchanged

  Scenario: An earlier experience note is shown read-only
    Given a character saved before the Journal with text in its experience field
    When the Journal tab is opened
    Then "Earlier experience note" shows that text and cannot be edited

  Scenario: Journal experience is accessible and fits a phone
    Given a character with a long ledger
    When the Journal tab is scanned for accessibility problems
    Then no problems are reported
    When the Journal tab is opened at 320 pixels wide with crowded content
    Then the page does not scroll sideways
