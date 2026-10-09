Feature: The sheet's tab host

  Scenario: The Character sheet still works as before
    Given a character in edit mode
    When the player raises Strength to 4 and returns to play mode
    Then the sheet shows Strength 4 and it is still 4 after a reload

  Scenario: A wound re-announces the selected pool
    Given a character in play mode with Strength and Brawl selected
    When the player marks a Hurt wound
    Then the Selected pool is announced with the wound subtracted
