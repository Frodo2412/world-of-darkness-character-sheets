Feature: Storage resilience

  Scenario: One unreadable record does not hide the others
    Given saved characters "Lucita" and "Fatima"
    And Fatima's saved data has become unreadable
    When the player opens the roster
    Then "Lucita" is listed and can be opened
    And one entry is reported as an unreadable character

  Scenario: An unreadable record is kept
    Given a saved character whose data has become unreadable
    When the player opens the roster and then reloads it
    Then the unreadable entry is still reported
    And its saved data is unchanged

  Scenario: Saved data of an unexpected shape
    Given a saved record that is readable but is not a V20 character
    When the player opens the roster
    Then that entry is reported as an unreadable character
    And creating a new character still works

  Scenario: Opening an unreadable character directly
    Given a saved character whose data has become unreadable
    When the player opens its sheet address
    Then they see that the character could not be read, with a link to the roster
    And its saved data is unchanged

  Scenario: The browser refuses to save
    Given a player viewing a character's sheet
    And the browser will not accept further saved data
    When they change the character's Name
    Then a "changes not saved" message is shown
    And they can keep editing the sheet

  Scenario: Saving recovers
    Given the "changes not saved" message is shown
    When the browser accepts saved data again and the player makes another change
    Then the message is no longer shown
    And after a reload the latest values are shown

  Scenario: Storage is unavailable when the roster opens
    Given the browser provides no storage to the page
    When the player opens the roster
    Then they see that characters cannot be saved in this browser

  Scenario: Storage is unavailable when a sheet opens
    Given the browser provides no storage to the page
    When the player opens a sheet address
    Then they see on the sheet page that characters cannot be saved in this browser

  Scenario: The browser refuses to save a new character
    Given a player with no saved characters
    And the roster is open and the browser will not accept further saved data
    When they try to create a V20 character
    Then they see that the new character could not be saved
    And the roster shows the empty state
