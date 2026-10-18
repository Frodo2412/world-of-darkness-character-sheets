Feature: Journal notes

  Scenario: A note is saved to the current session
    Given "Session 12" is current
    When the player presses "New note" on the Journal notes and writes a note titled "The portrait" in category "Clues" tagged "portrait"
    Then the note is listed under Session 12 and under Clues
    And the session and category counts include it
    And it is still there after a reload

  Scenario: The editor starts empty
    Given a character with notes
    When the Journal tab is opened
    Then the Journal notes editor says "Select a note or start a new one"

  Scenario: Writing a note with no session asks for one
    Given a character with no session
    When the player presses "New note" on the Journal notes
    Then the start-a-session prompt is shown in the Notes section

  Scenario: A new note while viewing an older session lands in the current one
    Given "Session 12" is current and the player is viewing "Session 10" on the Journal notes
    When the player creates a note
    Then the view switches to Session 12 and the new note is shown and focused

  Scenario: Autosave and Save note say so
    Given a note being edited with the clock fixed at 23:42
    When the player changes its title
    Then "All changes saved · 23:42" is announced
    When the player presses "Save note"
    Then the same status is shown

  Scenario: Typing is not disturbed by autosave
    Given a note being edited
    When the player types a long body with pauses longer than the autosave delay
    Then the body holds exactly what was typed and it is stored

  Scenario: Pinning and unpinning
    Given two notes
    When the player pins one
    Then it appears under Pinned and the Pinned count reads 1
    When the player unpins it
    Then the Pinned count reads 0

  Scenario: Formatting is applied
    Given a note being edited
    When the player makes text bold and italic, adds a bulleted list, a numbered list, a link and a quote
    Then the preview shows strong and emphasised text, an unordered list, an ordered list, a link and a block quote

  Scenario: A checklist can be ticked and unticked
    Given a note with three checklist items
    When the player ticks the second in the preview
    Then it shows as done and stays done after a reload
    When the player unticks it
    Then it shows as not done

  Scenario: Typed markup is shown as text
    Given a note being edited
    When the player types "<script>alert(1)</script>" and "<img src=x onerror=alert(1)>" in the body
    Then the preview shows that exact text
    And no dialog opens and no script or image element is added to the page

  Scenario: A javascript link is not made a link
    Given a note being edited
    When the player adds a link to "javascript:alert(1)"
    Then the preview shows the text and no link

  Scenario Outline: Search finds a note by one field
    Given a note titled "Alpha" with body "Beta text", tag "gamma" and mention "@Delta"
    When the player searches "<query>" on the Journal notes
    Then the note is listed

    Examples:
      | query |
      | alpha |
      | beta  |
      | gamma |
      | delta |

  Scenario: Search ignores case and accents
    Given a note titled "Éloïse"
    When the player searches "eloise" on the Journal notes
    Then the note is listed
    When the player searches "zzzz"
    Then "No notes match." is shown

  Scenario: Mentioned names become chips
    Given a note body containing "@Camille Arnaud met Lucien"
    Then the note lists "Camille Arnaud" among its mentioned names
    And a chip can be added and removed by hand

  Scenario: A note stays in its session
    Given a note in Session 12
    When the player starts a new session titled "Session 13" on the Journal tab
    Then the note is listed under Session 12 and not under Session 13

  Scenario: Notes are editable in play mode
    Given a character in play mode with a session
    When the player writes a note on the Journal notes
    Then it is saved and no trait on the character changes

  Scenario: Earlier notes are shown read-only
    Given a character saved before the Journal with text in its notes field
    When the Journal tab is opened
    Then "Earlier notes" shows that text and cannot be edited

  Scenario: Journal notes are accessible and fit a phone
    Given a character with a populated note being edited
    When the Journal tab is scanned for accessibility problems
    Then no problems are reported
    When the Journal tab is opened at 320 pixels wide with crowded content
    Then the page does not scroll sideways
    And choosing a note from the list moves focus to the editor
